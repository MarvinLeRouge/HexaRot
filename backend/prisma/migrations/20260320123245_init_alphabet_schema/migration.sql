-- CreateTable
CREATE TABLE "Alphabet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "symbolWidth" INTEGER NOT NULL,
    "symbolHeight" INTEGER NOT NULL,

    CONSTRAINT "Alphabet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Symbol" (
    "id" SERIAL NOT NULL,
    "char" TEXT NOT NULL,
    "variant" TEXT,
    "alphabetId" INTEGER NOT NULL,

    CONSTRAINT "Symbol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColorCase" (
    "id" SERIAL NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "symbolId" INTEGER NOT NULL,

    CONSTRAINT "ColorCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alphabet_name_key" ON "Alphabet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Symbol_char_variant_alphabetId_key" ON "Symbol"("char", "variant", "alphabetId");

-- CreateIndex
CREATE UNIQUE INDEX "ColorCase_x_y_symbolId_key" ON "ColorCase"("x", "y", "symbolId");

-- AddForeignKey
ALTER TABLE "Symbol" ADD CONSTRAINT "Symbol_alphabetId_fkey" FOREIGN KEY ("alphabetId") REFERENCES "Alphabet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColorCase" ADD CONSTRAINT "ColorCase_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
