import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { compare, hash, hashSync } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MAILER_SERVICE, type MailerService } from '../mailer/mailer.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Prisma, Role, User } from '../../generated/prisma/client';

/** Public-safe user shape: never includes passwordHash. */
export interface PublicUser {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  active: boolean;
  createdAt: Date;
}

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

/** Precomputed so login() can always run a bcrypt.compare, even when the
 * email does not match a user, keeping response timing consistent
 * (prevents timing-based account enumeration). */
const DUMMY_PASSWORD_HASH = hashSync(
  'dummy-password-for-timing-safety',
  BCRYPT_ROUNDS,
);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(MAILER_SERVICE) private readonly mailer: MailerService,
  ) {}

  async register(dto: RegisterDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await hash(dto.password, BCRYPT_ROUNDS);
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: { email: dto.email, passwordHash },
      });
    } catch (err) {
      if (isUniqueEmailConstraintError(err)) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw err;
    }

    await this.issueVerificationToken(user.id, user.email);

    return this.toPublicUser(user);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });
    await this.prisma.verificationToken.deleteMany({
      where: { userId: record.userId },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user && !user.emailVerified) {
      await this.issueVerificationToken(user.id, user.email);
    }

    return {
      message:
        'If an account with this email exists, a verification email has been sent.',
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const passwordMatches = await compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.active) {
      throw new ForbiddenException('This account has been disabled');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email address not verified');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    return { accessToken };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return this.toPublicUser(user);
  }

  private async issueVerificationToken(
    userId: string,
    email: string,
  ): Promise<void> {
    await this.prisma.verificationToken.deleteMany({ where: { userId } });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await this.prisma.verificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    await this.mailer.sendVerificationEmail(email, rawToken);
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      active: user.active,
      createdAt: user.createdAt,
    };
  }
}

/**
 * Narrows an unknown catch value to a Prisma unique-constraint violation
 * (error code P2002), the case that fires when a concurrent registration
 * for the same email wins the race against this service's pre-check.
 */
function isUniqueEmailConstraintError(
  err: unknown,
): err is Prisma.PrismaClientKnownRequestError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  );
}
