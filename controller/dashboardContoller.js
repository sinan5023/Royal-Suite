const dashboardData = {
  user: {
    name: "Jasi",
    role: "Manager",
  },
  greeting: "Good Afternoon",
  currentDate: "Thursday, November 27, 2025",

  stats: {
    deliveriesToday: 12,
    deliveriesChange: "+3 vs yesterday",
    returnsDueToday: 5,
    returnsChange: "-1 vs yesterday",
    overdueReturns: 3,
    overdueChange: "+1 vs yesterday",
    activeBookings: 78,
    activeChange: "+8 this week",
    revenuePercent: 92,
    revenueStatus: "On track",
    utilization: 74,
    utilizationChange: "+4 pts",
  },

  deliveries: {
    today: [
      { customerName: "Alice Johnson", productName: "Legacy Pro Suit" },
      { customerName: "Charlie Brown", productName: "Classic Black Tuxedo" },
      { customerName: "Diana Prince", productName: "Grey Morning Suit" },
      { customerName: "Frank White", productName: "Navy Blue Suit" },
    ],
    tomorrow: [
      { customerName: "Grace Hopper", productName: "Charcoal Suit" },
      { customerName: "Heidi Lamar", productName: "Burgundy Tuxedo" },
      { customerName: "Ivan Petrov", productName: "Slim Fit Suit" },
      { customerName: "Judy Garland", productName: "Wedding Suit" },
    ],
    dayAfter: [
      { customerName: "Kevin Mitnick", productName: "Three Piece Suit" },
      { customerName: "Linda Hamilton", productName: "Vintage Tuxedo" },
    ],
  },

  returns: [
    {
      customerName: "John Doe",
      productName: "Classic Black Tuxedo",
      isOverdue: true,
    },
    {
      customerName: "Jane Smith",
      productName: "Navy Blue Suit",
      isOverdue: true,
    },
    {
      customerName: "Alice Johnson",
      productName: "Grey Morning Suit",
      isOverdue: false,
    },
    {
      customerName: "Bob Wilson",
      productName: "Burgundy Tuxedo",
      isOverdue: false,
    },
    {
      customerName: "Carol Martinez",
      productName: "Three Piece Suit",
      isOverdue: false,
    },
  ],

  notifications: [
    {
      message: 'New customer "Sarah Green" registered.',
      timeAgo: "5 mins ago",
    },
    {
      message: "Booking #9323 updated by staff.",
      timeAgo: "18 mins ago",
    },
    {
      message: "Low stock alert: Black Tuxedo, size 42.",
      timeAgo: "2 hours ago",
    },
  ],

  todayNotes: "",
};
const displayDashboard = async (req, res) => {
  res.render("homeDashboard",dashboardData);
};

module.exports = { displayDashboard };
