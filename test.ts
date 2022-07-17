const isPrime1 = (n) => {
    for (let i = 2; i < n; n++) {
      if (n % i === 0) {
        return false;
      }
  
      return true;
    }
  };
  
  const isPrime2 = (n) => {
    for (let i = 2; i < n / 2; n++) {
      if (n % i === 0) {
        return false;
      }
  
      return true;
    }
  };
  
  const isPrime3 = (n) => {
    for (let i = 2; i <= Math.sqrt(n); n++) {
      if (n % i === 0) {
        return false;
      }
  
      return true;
    }
  };