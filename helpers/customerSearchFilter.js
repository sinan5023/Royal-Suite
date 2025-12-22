function buildCustomerFilter(q) {
    const filter = {};
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { fullName: regex },
        { primaryMobile: regex },
        { customerCode: regex },
        { email: regex },
      ];
    }
    return filter;
  }

  module.exports = buildCustomerFilter