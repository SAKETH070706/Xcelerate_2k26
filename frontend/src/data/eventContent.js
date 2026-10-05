// Event content for Xcelerate-2K26 - Concise, Clean & Structured

export const EVENT_DATA = {
    meta: {
        title: "Xcelerate-2K26",
        edition: "Technical Symposium",
        organizer: "SRKR ACM Student Chapter",
        institution: "SRKR Engineering College",
        dates: "2-Day Technical Event",
        timing: "9:00 AM - 4:30 PM",
        venue: "SRKR Campus",
        motto: ["Engage", "Explore", "Evolve"],
        description:
            "Day 1 features foundation theory across modern tech domains. Day 2 is a dedicated, full-day practical workshop where students select and work exclusively in 1 domain.",
    },

    // Day 1 Theory Curriculum
    tracks: [
        {
            id: "ai-eng",
            name: "AI for Engineering",
            tag: "Day 1 Morning",
            summary: "Generative AI, prompt engineering workflows, and system integration.",
        },
        {
            id: "aiml",
            name: "AI & Machine Learning",
            tag: "Day 1 Morning",
            summary: "Neural network principles, predictive modeling, and model training.",
        },
        {
            id: "iot-cyber",
            name: "IoT & Cybersecurity",
            tag: "Day 1 Afternoon",
            summary: "Connected smart hardware, network defense protocols, and threat security.",
        },
        {
            id: "quantum",
            name: "Quantum Computing",
            tag: "Day 1 Afternoon",
            summary: "Qubit fundamentals, superposition principles, and quantum logic gates.",
        },
        {
            id: "dsa",
            name: "DSA Roadmap",
            tag: "Day 1 Afternoon",
            summary: "Core algorithms, data structures, and problem-solving strategies.",
        },
    ],

    // Day 2 Selectable Practical Domains (Each attendee chooses 1 for all-day hands-on)
    day2Domains: [
        {
            id: "aiml",
            title: "AI & Machine Learning",
            tag: "Full-Day Workshop",
            desc: "Train models, build machine learning pipelines, and deploy AI solutions in code.",
        },
        {
            id: "software-dev",
            title: "Software Development",
            tag: "Full-Day Workshop",
            desc: "Build modern web apps, develop backend APIs, and practice clean software workflows.",
        },
        {
            id: "iot-cyber",
            title: "IoT & Cybersecurity",
            tag: "Full-Day Workshop",
            desc: "Configure IoT devices, analyze network traffic, and practice defensive ethical security.",
        },
    ],

    schedule: [
        {
            day: "Day 1",
            title: "Theory & Concepts",
            subtitle: "Morning: AI & AIML | Afternoon: IoT, Cyber, Quantum & DSA",
            sessions: [
                {
                    time: "09:00 AM - 09:30 AM",
                    title: "Inauguration & Welcome",
                    description: "Keynote address and symposium kickoff.",
                },
                {
                    time: "09:30 AM - 11:00 AM",
                    title: "Theory: AI for Engineering",
                    description: "Prompt engineering, generative models, and engineering applications.",
                },
                {
                    time: "11:15 AM - 12:00 PM",
                    title: "Theory: AIML Foundations",
                    description: "Core algorithms, neural networks, and model training workflows.",
                },
                {
                    time: "12:00 PM - 01:30 PM",
                    title: "Lunch Break",
                    description: "Mid-day break and networking.",
                },
                {
                    time: "01:30 PM - 02:45 PM",
                    title: "Theory: IoT & Cybersecurity",
                    description: "Smart sensor ecosystems and defensive cybersecurity principles.",
                },
                {
                    time: "02:45 PM - 03:30 PM",
                    title: "Theory: Quantum Computing",
                    description: "Qubit basics, superposition, and quantum computing concepts.",
                },
                {
                    time: "03:30 PM - 04:30 PM",
                    title: "Theory: DSA Roadmap",
                    description: "Placement roadmap, algorithm efficiency, and problem solving.",
                },
            ],
        },
        {
            day: "Day 2",
            title: "Full-Day Hands-on Workshop",
            subtitle: "Students select 1 domain for an intensive, all-day practical lab",
            sessions: [
                {
                    time: "09:00 AM - 09:30 AM",
                    title: "Domain Lab Allocation",
                    description: "Setup and entry into your selected domain workshop lab.",
                },
                {
                    time: "09:30 AM - 12:00 PM",
                    title: "Hands-on Lab: Session 1",
                    description: "Hands-on implementation and project setup in your chosen domain.",
                },
                {
                    time: "12:00 PM - 01:30 PM",
                    title: "Lunch Break",
                    description: "Mid-day refreshment break.",
                },
                {
                    time: "01:30 PM - 03:45 PM",
                    title: "Hands-on Lab: Session 2",
                    description: "Advanced exercises, project building, testing, and completion.",
                },
                {
                    time: "03:45 PM - 04:30 PM",
                    title: "Valedictory & Pass Verification",
                    description: "Closing ceremony, feedback, and attendance verification.",
                },
            ],
        },
    ],

    perks: [
        {
            icon: "📜",
            title: "Official Certificate",
            description: "Issued by SRKR ACM Student Chapter.",
        },
        {
            icon: "💻",
            title: "Dedicated Domain Lab",
            description: "Full-day practical training exclusively in your selected domain on Day 2.",
        },
        {
            icon: "📦",
            title: "Curated Resource Kit",
            description: "Source code repositories, slide decks, and reference guides.",
        },
        {
            icon: "🤝",
            title: "Mentor Support",
            description: "Direct assistance from domain leads during hands-on sessions.",
        },
    ],

    faqs: [
        {
            q: "How does the Day 2 hands-on workshop work?",
            a: "Day 2 is not a generic session. Participants choose 1 domain (AI/ML, Software Development, or IoT & Cybersecurity) and spend the entire day in that dedicated hands-on lab.",
        },
        {
            q: "Who is eligible to participate?",
            a: "Open to all engineering students across all branches and academic years.",
        },
        {
            q: "Should participants bring a laptop?",
            a: "Yes, bringing a laptop is strongly encouraged for the Day 2 practical lab.",
        },
    ],
};
