const portfolioSections = {
  dummy: {
    pages: [
    
      {
        title: 'Contact me',
        text: 'Find me online or get in touch.',
        links: [
          {
            icon: 'gmail',
            label: 'Send me an email',
            href: 'mailto:saracristinabasco@outlook.com',
          },
          {
            icon: 'linkedin',
            label: 'Open my LinkedIn profile',
            href: 'https://www.linkedin.com/in/sara-cristina-basco-5303ab288/',
            external: true,
          },
          {
            icon: 'github',
            label: 'Open my GitHub profile',
            href: 'https://github.com/k4ru4kai',
            external: true,
          },
          {
            icon: 'instagram',
            label: 'Open my Instagram profile',
            href: 'https://www.instagram.com/sarabsc.h?igsh=MWd5d3JtNDA4cjZydg==',
            external: true,
          },
        ],
      },
      {
        title: 'About this project',
        text: 'Born from a university project in Interactive Graphics, Inside My System brings together two of my greatest passions: illustration and engineering. Keep exploring to discover more.',
      },
    ],
  },
  about: {
    pages: [
      {
        title: 'About me',
        text: 'Hello, user! I’m Sarah, a graduate student in Artificial Intelligence and Robotics with a background in Information Engineering. My main interests include intelligent systems, computer graphics and interactive application development. Alongside engineering, I have a strong passion for illustration, which often influences the way I approach technology, visual design and creative problem-solving.',
      },
    ],
  },
  projects: {
    pages: [
      {
        title: 'PROJECTS',
        introduction:
          'A selection of academic and personal projects exploring artificial intelligence, software development and interactive graphics.',
        projects: [
          {
            id: 'semantic-search-rag',
            number: '01',
            title: 'From Semantic Search to RAG',
            indexCategory: 'Multilingual NLP',
            category: 'Multilingual Natural Language Processing',
            year: '2026',
            context: 'Academic project · Sapienza University of Rome',
            description:
              'Developed a question-answering pipeline based on small language models, combining semantic retrieval and RAG-based approaches.',
            contributions: [
              'Model fine-tuning',
              'Experimental evaluation',
              'Result analysis',
              'Evaluation using EM, subEM and METEOR',
            ],
            technologies: [
              'Python',
              'Hugging Face Transformers',
              'Small Language Models',
              'Semantic Search',
              'RAG',
              'Evaluation Frameworks',
            ],
          },
          {
            id: 'image-classification-localization',
            number: '02',
            title: 'Image Classification and Object Localization',
            category: 'Machine Learning and Computer Vision',
            year: '2025',
            context: 'Academic project · Sapienza University of Rome',
            description:
              'Developed a machine learning pipeline for object recognition and localization in a robotic soccer environment using images from the SPQR Dataset.',
            contributions: [
              'CNN-based semantic image classification',
              'Object-center regression',
              'Image preprocessing',
              'Label encoding',
              'Bounding-box coordinate normalization',
              'Training and evaluation in a Docker-based CPU environment',
            ],
            results: [
              {
                value: '83.02%',
                label: 'Classification accuracy',
              },
              {
                value: '0.0383',
                label: 'Localization MSE',
              },
            ],
            technologies: [
              'Python',
              'PyTorch',
              'CNNs',
              'Computer Vision',
              'Docker',
              'Image Classification',
              'Object Localization',
            ],
          },
          {
            id: 'astar-sat-pathfinding',
            number: '03',
            title: 'A* and SAT-Based Pathfinding',
            category: 'Artificial Intelligence',
            year: '2025',
            context: 'Academic project · Sapienza University of Rome',
            description:
              'Compared heuristic search and logic-based planning for grid-based navigation.',
            contributions: [
              'A* implementation',
              'Manhattan and Euclidean heuristics',
              'SAT-based planner',
              'Scalability analysis',
              'Optimality evaluation',
              'Node-expansion analysis',
              'Stress testing on labyrinth scenarios',
            ],
            technologies: [
              'Python',
              'A*',
              'SAT Solving',
              'PySAT',
              'Glucose3',
              'Algorithm Benchmarking',
            ],
          },
          {
            id: 'inside-my-system',
            number: '04',
            title: 'Inside My System',
            category: 'Interactive Graphics',
            year: '2026 — Present',
            context:
              'Academic and personal project · Sapienza University of Rome',
            description:
              'An interactive 3D portfolio structured as a navigable computer system, where internal hardware components act as clickable CV sections.',
            contributionsLabel: 'Main features',
            contributions: [
              'Real-time 3D environment',
              'Lighting and textures',
              'Camera navigation',
              'Interactive CV sections',
              'Custom animations',
              'Hierarchical character model',
              'Dummy as an interactive guide',
            ],
            technologies: [
              'JavaScript',
              'Three.js',
              'Blender',
              '3D Modelling',
              'Real-Time Rendering',
              'Interaction Design',
            ],
          },
          {
            id: 'nowhere-forest',
            number: '05',
            title: 'NoWhere Forest',
            category: 'Game Development',
            year: '2023',
            context: 'University Game Jam · University of Naples Parthenope',
            role: 'Co-leader, Developer and Animator',
            description:
              'Developed an indie endless-runner videogame in 48 hours as part of a six-person team.',
            contributions: [
              'Original game concept',
              'Player movement and jumping',
              'Obstacle and boost spawning',
              'Collision logic',
              'Death zones',
              'Parallax background',
              'Menu flow',
              'Restart screen',
              'Character animation',
            ],
            technologies: [
              'Godot 4.1',
              'GDScript',
              '2D Game Development',
              'Animation',
              'Gameplay Prototyping',
            ],
          },
        ],
      },
    ],
  },
  academic: {
    pages: [
      {
        title: 'ACADEMIC BACKGROUND',
        experiences: [
          {
            tabLabel: 'M.Sc.',
            type: 'M.Sc.',
            headline: 'Artificial Intelligence\nand Robotics',
            institution: 'Sapienza University of Rome',
            period: '2025 — Present',
            areasLabel: 'Focus areas',
            areas: [
              'Artificial Intelligence',
              'Machine Learning',
              'Computer Vision',
              'Multilingual Natural Language Processing',
              'Robotics',
            ],
          },
          {
            tabLabel: 'B.Sc.',
            type: 'B.Sc.',
            headline: 'Computer, Biomedical and\nTelecommunications Engineering',
            institution: 'University of Naples Parthenope',
            period: '2021 — 2025',
            areasLabel: 'Core areas',
            areas: [
              'Programming',
              'Numerical Analysis',
              'Signal Processing',
              'Systems Theory',
              'Telecommunications',
            ],
          },
          {
            tabLabel: 'Erasmus+',
            type: 'ERASMUS+',
            headline: 'University of Jaén',
            period: 'Spain · 2023 — 2024',
            description:
              'International academic experience focused on telematic services, web application management, statistics and cross-cultural collaboration.',
          },
        ],
      },
    ],
  },
  experience: {
    pages: [
      {
        title: 'WORK EXPERIENCE',
        workExperiences: [
          {
            id: 'accenture-data-engineer',
            number: '01',
            title: 'Data Engineer Intern',
            company: 'Accenture',
            period: 'March 2026 — Present',
            location: 'Italy / Remote',
            summary:
              'Contributing to backend development and operational support for an international client in the Energy Management sector.',
            responsibilities: [
              'Developing, debugging and monitoring backend workflows, API integrations and scheduled processes.',
              'Investigating anomalies through application logs and Kibana.',
              'Identifying data inconsistencies and supporting the implementation of backend fixes.',
              'Contributing to the standardization of daily production-monitoring procedures.',
            ],
            technologies: [
              'Java',
              'Spring Boot',
              'Apache Camel',
              'MongoDB',
              'REST APIs',
              'Kibana',
              'Git',
              'Bitbucket',
              'Jira',
            ],
          },
          {
            id: 'italo-sales-assistant',
            number: '02',
            title: 'Sales Assistant & Promoter',
            company: 'Italo',
            period: 'September 2025 — January 2026',
            location: 'Rome, Italy',
            summary:
              'Worked in a fast-paced and international customer-facing environment.',
            responsibilities: [
              'Managed product promotion, ticket sales, payments and customer support.',
              'Resolved operational issues and complex customer situations in real time.',
              'Supported the onboarding and training of new team members.',
              'Developed strong communication, adaptability and problem-solving skills.',
            ],
          },
          {
            id: 'self-employed-tutor',
            number: '03',
            title: 'Mathematics and Physics Tutor',
            company: 'Self-employed',
            period: '2021 — 2025',
            location: 'Remote, Italy',
            summary:
              'Provided individual tutoring and academic support to high-school and international students.',
            responsibilities: [
              'Explained mathematical and scientific concepts by adapting language and abstraction to each student.',
              'Developed personalized teaching methods according to different learning needs.',
              'Strengthened technical communication, analytical explanation and problem-decomposition skills.',
            ],
          },
        ],
      },
    ],
  },
  interests: {
    pages: [
      {
        title: 'Hobby and interests',
        text: 'A total nerd for good storytelling—whether it’s in a gallery, a book, a movie, or a video game. Offline, I’m a compulsive traveler who always has the next plane ticket booked',
      },
    ],
  },
};

export default portfolioSections;
