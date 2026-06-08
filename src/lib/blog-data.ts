export interface BlogPost {
  id: number | string;
  title: string;
  category: string;
  image: string;
  date: string;
  featured: boolean;
  color: string;
  authors?: Array<{
    name: string;
    role?: string;
    image?: string;
    initials?: string;
  }>;
  content?: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "How to Host Successful Virtual Events",
    category: "Events",
    image: "/images/Overview (1).png",
    date: "Mar 12, 2026",
    featured: true,
    color: "#22c55e",
    authors: [
      { name: "Achilonu Joseph", role: "Amptive", image: "https://pbs.twimg.com/profile_images/2036342065353859074/WhGeSMMy_400x400.jpg", initials: "AJ" },
      { name: "Edeh Gerald", role: "Amptive", image: "https://media.licdn.com/dms/image/v2/D4D03AQHDUju74AW1eA/profile-displayphoto-shrink_400_400/B4DZnZLsVMKoAk-/0/1760285346414?e=1777507200&v=beta&t=FkuIk5bd2WbivnLxZFshqki1xtW0iJOyu6D7V91xrcw", initials: "EG" }
    ]
  },
  {
    id: 2,
    title: "Top 5 Event Marketing Strategies for 2024",
    category: "Insights",
    image: "/images/Overview.png",
    date: "Mar 10, 2026",
    featured: true,
    color: "#f59e0b",
    authors: [
      { name: "Joshua Marker", initials: "JM" },
      { name: "Eddie Siegel", initials: "ES" }
    ]
  },
  {
    id: 3,
    title: "Essential Tips for Perfect Audio Quality",
    category: "Amptive",
    image: "/images/Overview (2).png",
    date: "Mar 5, 2026",
    featured: true,
    color: "#3b82f6",
    authors: [
      { name: "Edeh Gerald", role: "Amptive", image: "https://media.licdn.com/dms/image/v2/D4D03AQHDUju74AW1eA/profile-displayphoto-shrink_400_400/B4DZnZLsVMKoAk-/0/1760285346414?e=1777507200&v=beta&t=FkuIk5bd2WbivnLxZFshqki1xtW0iJOyu6D7V91xrcw", initials: "EG" }
    ]
  },
  {
    id: 4,
    title: "The Future of Live Audio Experiences",
    category: "Insights",
    image: "/images/Overview.png",
    date: "Feb 28, 2026",
    featured: false,
    color: "#f59e0b",
    authors: [
      { name: "Achilonu Joseph", role: "Amptive", image: "https://pbs.twimg.com/profile_images/2036342065353859074/WhGeSMMy_400x400.jpg", initials: "AJ" }
    ]
  },
  {
    id: 5,
    title: "How to Keep Your Audience Engaged",
    category: "Insights",
    image: "/images/Overview.png",
    date: "Feb 20, 2026",
    featured: false,
    color: "#f59e0b",
    authors: [
      { name: "Eddie Siegel", initials: "ES" }
    ]
  },
  {
    id: 6,
    title: "Monetization Strategies for Creators",
    category: "Amptive",
    image: "/images/Overview (2).png",
    date: "Feb 15, 2026",
    featured: false,
    color: "#3b82f6",
    authors: [
      { name: "Joshua Marker", initials: "JM" }
    ]
  },
  {
    id: 7,
    title: "Product Roundup: February 2026",
    category: "Product",
    image: "/images/Overview.png",
    date: "Feb 10, 2026",
    featured: false,
    color: "#8b5cf6",
    authors: [
      { name: "Amptive Team", initials: "AT" }
    ]
  },
  {
    id: 8,
    title: "Community Spotlights: Art & Culture",
    category: "Community",
    image: "/images/Overview (1).png",
    date: "Feb 5, 2026",
    featured: false,
    color: "#ec4899",
    authors: [
      { name: "Edeh Gerald", role: "Amptive", image: "https://media.licdn.com/dms/image/v2/D4D03AQHDUju74AW1eA/profile-displayphoto-shrink_400_400/B4DZnZLsVMKoAk-/0/1760285346414?e=1777507200&v=beta&t=FkuIk5bd2WbivnLxZFshqki1xtW0iJOyu6D7V91xrcw", initials: "EG" }
    ]
  }
];

export const blogCategories = ['All', 'Events', 'Insights', 'Amptive', 'Product', 'Community'];
