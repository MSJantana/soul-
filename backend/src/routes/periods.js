const { getPeriodKey } = require("../utils/periodKey");

function registerPeriodRoutes(app) {
  app.get("/api/periods/current", (req, res) => {
    const now = new Date();
    res.json({
      now: now.toISOString(),
      weekKey: getPeriodKey(now, "WEEK"),
      monthKey: getPeriodKey(now, "MONTH"),
      quarterKey: getPeriodKey(now, "QUARTER"),
      semesterKey: getPeriodKey(now, "SEMESTER"),
      yearKey: getPeriodKey(now, "YEAR"),
    });
  });
}

module.exports = { registerPeriodRoutes };

