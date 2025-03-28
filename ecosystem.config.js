module.exports = {
  apps: [{
    name: "cd-estoque-api",
    script: "./src/server.js",
    env: {
      NODE_ENV: "production",
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    error_file: "/sistema/logs/err.log",
    out_file: "/sistema/logs/out.log",
    log_file: "/sistema/logs/combined.log",
    time: true
  }]
}
