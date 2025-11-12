(() => {
  // Crtl + C
  process.on('SIGINT', () => {
    console.log('SIGINT: Exiting...');
    process.exit(0);
  });

  // Standard crash
  process.on('uncaughtException', (e) => {
    console.log('UNCAUGHT EXCEPTION:', e);
    if (e && e.cause) {
      console.log('CAUSE:', e.cause);
    }
  });

  // Killed process
  process.on('SIGTERM', () => {
    console.log('SIGTERM: Exiting...');
    process.exit(0);
  });

  // Standard crash
  process.on('unhandledRejection', (e: any) => {
    console.log('UNHANDLED REJECTION:', e);
    if (e && e.cause) {
      console.log('CAUSE:', e.cause);
    }
  });

  // Deprecation warnings
  process.on('warning', (warning) => {
    console.log(`WARNING: ${warning.name} : ${warning.message}`);
  });
})();
