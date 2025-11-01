(() => {
  // Crtl + C
  process.on('SIGINT', () => {
    console.log('SIGINT: Exiting...');
    process.exit(0);
  });

  // Standard crash
  process.on('uncaughtException', (err) => {
    console.log(`UNCAUGHT EXCEPTION: ${err}`);
  });

  // Killed process
  process.on('SIGTERM', () => {
    console.log('SIGTERM: Exiting...');
    process.exit(0);
  });

  // Standard crash
  process.on('unhandledRejection', (err: any) => {
    console.log('UNHANDLED REJECTION:', err);
    if (err && err.cause) {
      console.log('CAUSE:', err.cause);
    }
  });

  // Deprecation warnings
  process.on('warning', (warning) => {
    console.log(`WARNING: ${warning.name} : ${warning.message}`);
  });
})();
