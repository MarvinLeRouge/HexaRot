<template>
  <svg
    class="loading-spinner"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <circle
      class="loading-spinner__track"
      cx="8"
      cy="8"
      r="6"
      fill="none"
      stroke-width="2"
    />
    <circle
      class="loading-spinner__arc"
      cx="8"
      cy="8"
      r="6"
      fill="none"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.loading-spinner {
  flex-shrink: 0;
}

.loading-spinner__track {
  stroke: var(--border);
}

.loading-spinner__arc {
  stroke: currentColor;
  stroke-dasharray: 14 24;
  transform-origin: center;
  animation: loading-spinner-rotate 0.8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner__arc {
    animation: none;
  }
}

@keyframes loading-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
