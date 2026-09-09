import { createRouter, createWebHistory } from 'vue-router'
import EncodeView from '../views/EncodeView.vue'
import DecodeView from '../views/DecodeView.vue'
import KeyView from '../views/KeyView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import VerifyEmailView from '../views/VerifyEmailView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import { useAuthStore } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/encode' },
    { path: '/encode', name: 'encode', component: EncodeView, meta: { requiresAuth: true } },
    { path: '/decode', name: 'decode', component: DecodeView, meta: { requiresAuth: true } },
    { path: '/key', name: 'key', component: KeyView, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/verify-email', name: 'verify-email', component: VerifyEmailView },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.accessToken) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && authStore.user?.role !== 'ADMIN') {
    return { path: '/encode' }
  }

  return true
})
