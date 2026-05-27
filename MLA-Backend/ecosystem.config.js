module.exports = {
  apps: [
    {
      name: 'mla-grievance-api',
      script: 'dist/app.js',
      instances: 'max', // Utilizes all available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Ensures zero-downtime reloads
      wait_ready: true,
      listen_timeout: 50000,
      kill_timeout: 5000,
    },
  ],
};
