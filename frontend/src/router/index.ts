import { createRouter, createWebHistory } from 'vue-router'
import EncodeView from '../views/EncodeView.vue'
import DecodeView from '../views/DecodeView.vue'
import KeyView from '../views/KeyView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/encode' },
    { path: '/encode', name: 'encode', component: EncodeView },
    { path: '/decode', name: 'decode', component: DecodeView },
    { path: '/key', name: 'key', component: KeyView },
  ],
})
