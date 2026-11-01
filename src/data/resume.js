/*
 * Everything the site says about Sarthak, word for word from the résumé
 * (public/Sarthak_Sharma_Backend_Developer.pdf). The page, the terminal and Spidey's showcase all read
 * from here; test/resume.test.js checks every line of the PDF ends up on the page.
 * To update the site, update the PDF and this file together.
 */
export const resume = {
  name: 'Sarthak Sharma',
  title: 'Backend Developer',
  contact: {
    email: 'sarthakjk14@gmail.com',
    phone: '+91 9086516883',
    location: 'Udhampur, J&K 182101, India',
    github: 'https://github.com/sarthakctrl',
    resumePdf: 'Sarthak_Sharma_Backend_Developer.pdf',
  },

  summary: [
    'Backend Developer with hands-on experience building and maintaining production-grade web applications in Java (Java 8, Spring Boot) and .NET.',
    'Skilled in REST API development, database design, JWT-based authentication and authorization, and debugging live production systems.',
    'Have delivered scalable modules across CRM, HRMS, and commercial SaaS platforms.',
  ],

  /** The facts strip under the summary. Each one is stated on the résumé. */
  facts: [
    { big: 'Jul 2025', small: 'Backend Developer at Wealthmax' },
    { big: '6 months', small: 'MERN Stack internship, Solitaire Infosys' },
    { big: '7', small: 'person team led at Sambodhan' },
    { big: '15 days', small: 'to ship “0 Unveiled”' },
  ],

  skills: [
    { group: 'Languages', items: ['Java (Primary)', 'C# / .NET', 'JavaScript', 'SQL', 'Python', 'C', 'C++', 'PHP'], primary: ['Java (Primary)'] },
    { group: 'Backend & Frameworks', items: ['Java 8', 'Spring Boot', '.NET', 'Node.js', 'Express.js', 'REST APIs'] },
    { group: 'Frontend & Web', items: ['React', 'HTML', 'CSS', 'Bootstrap (MERN Stack)'] },
    { group: 'Databases', items: ['MySQL', 'PostgreSQL', 'MongoDB', 'Database Design'] },
    { group: 'DevOps (Interest)', items: ['CI/CD Pipelines (Azure)', 'Linux Commands', 'Agent Jobs', 'Virtual Machine Configuration'] },
    {
      group: 'Concepts & Tools',
      items: ['JWT Authentication & Authorization', 'Email API Integration', 'Role-Based Permissions (SaaS)', 'Debugging', 'Git'],
    },
    { group: 'Soft Skills', items: ['Problem Solver', 'Critical Thinker', 'Team Player', 'Punctual'], wide: true },
  ],

  experience: [
    {
      tag: 'Now',
      title: 'Backend Developer',
      company: 'Wealthmax',
      dates: 'Jul 2025 – Present',
      stack: 'Java (Primary) & .NET',
      current: true,
      points: [
        'Debug and resolve production issues across live applications, improving stability and reliability of client-facing platforms.',
        'Developed email-sending APIs in Java, applying Java 8 concepts and clean, maintainable design.',
        'Built JWT-based authentication and authorization for the HRMS platform, securing user access and role management.',
        'Developed multiple standalone modules and implemented role-based permissions for the Protection & Mortgage (P&M) CRM SaaS, built in .NET.',
        'Applied database design principles and strong debugging skills across both Java and .NET codebases.',
      ],
    },
    {
      tag: 'Intern',
      title: 'MERN Stack Developer',
      company: 'Intern, Solitaire Infosys',
      dates: 'Dec 2024 – Jun 2025',
      points: [
        'Completed a 6-month internship building full-stack web applications with MongoDB, Express.js, React, and Node.js.',
        'Developed responsive interfaces and REST APIs, strengthening end-to-end full-stack fundamentals.',
      ],
    },
    {
      tag: 'Founder',
      title: 'Co-Founder',
      company: 'Sambodhan',
      dates: 'Feb 2024 – Present',
      points: [
        'Co-founded a networking platform focused on connecting people and scaling communities faster.',
        'Led a team of 7 to design and ship a software product, “0 Unveiled,” delivered in just 15 days.',
      ],
    },
  ],

  projects: [
    {
      name: 'HRMS Platform (Java)',
      slug: 'hrms-platform',
      about: 'JWT authentication & authorization with role and permission management for HR workflows.',
      tags: ['Java', 'JWT', 'Roles & permissions'],
    },
    {
      name: 'CLCRM — Commercial Landing (Java)',
      slug: 'clcrm',
      about: 'Built and refined backend CRM modules.',
      links: ['https://stagingfe.wealthmaxcommercial.co.uk/'],
    },
    {
      name: 'P&M CRM SaaS (.NET)',
      slug: 'pm-crm-saas',
      about: 'Developed multiple standalone modules and granular role-based permissions.',
      tags: ['.NET', 'Role-based permissions'],
    },
    {
      name: 'Production Support & Email APIs',
      slug: 'production-support',
      about: 'Fixed live production issues and built email-sending APIs.',
      links: ['https://myzone.wealthmax.co.uk/', 'https://wealthmax.co.uk/'],
    },
  ],

  education: [
    { degree: "Bachelor's in Computer Science", school: 'YCET, Jammu', dates: 'Sep 2021 – Aug 2025', place: 'Akhnoor Road, Patoli, Jammu' },
    { degree: 'Senior Secondary (12th)', school: 'M.L Higher Secondary School, Udhampur', dates: '2020 – 2021' },
    { degree: 'Matriculation (10th)', school: 'E.G.M.A, Udhampur', dates: '2018 – 2019' },
  ],

  certifications: [
    'Python 3.4.3, C++ & HTML — IIT Bombay',
    'Web Development Summer Training — IIT Jammu',
    'Introduction to IoT & Environmental Science — IIT Kharagpur',
  ],

  achievements: [
    'E-SDP Entrepreneurship Workshop — IIT Jammu',
    'Capital Building Program (Small Business) — IIM Jammu',
    'Summer Internship in IoT — IIT Jammu',
    'Code-a-thon — IMS Jammu',
    '3D Printing Course — IIT Jammu',
  ],

  /** What Spidey pops up every couple of minutes, taking turns between the three lists. */
  showcase: {
    experience: [
      'Sarthak is a Backend Developer at Wealthmax, since Jul 2025. Java (Primary) & .NET.',
      'He built JWT-based authentication and authorization for the HRMS platform.',
      'He developed email-sending APIs in Java, applying Java 8 concepts.',
      'Role-based permissions for the Protection & Mortgage (P&M) CRM SaaS, built in .NET? That was him.',
      'He debugs and resolves production issues across live applications.',
      'Before Wealthmax: a 6-month MERN Stack internship at Solitaire Infosys.',
      'Co-Founder of Sambodhan. He led a team of 7 to ship “0 Unveiled” in just 15 days!',
    ],
    skills: [
      'His main suit: Java (Primary), with Java 8 and Spring Boot.',
      'He also works in .NET, Node.js and Express.js, building REST APIs.',
      'Databases: MySQL, PostgreSQL, MongoDB, and database design.',
      'Languages: Java, C# / .NET, JavaScript, SQL, Python, C, C++ and PHP.',
      'Frontend too: React, HTML, CSS, Bootstrap (MERN Stack).',
      'DevOps interest: CI/CD Pipelines (Azure), Linux, Agent Jobs, VM configuration.',
    ],
    achievements: [
      "Bachelor's in Computer Science from YCET, Jammu (2021 – 2025).",
      'Certified in Python 3.4.3, C++ & HTML by IIT Bombay.',
      'Web Development Summer Training at IIT Jammu.',
      'Capital Building Program (Small Business) at IIM Jammu.',
      'E-SDP Entrepreneurship Workshop and a Summer Internship in IoT, both at IIT Jammu.',
      'Code-a-thon at IMS Jammu, and a 3D Printing Course at IIT Jammu.',
    ],
  },
};
