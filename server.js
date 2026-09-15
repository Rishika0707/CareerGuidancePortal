const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

function hashUserPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");

    return {
        hash,
        salt
    };
}

function verifyUserPassword(password, storedHash, salt) {
    try {
        const hash = crypto.scryptSync(password, salt, 64);

        const storedBuffer = Buffer.from(storedHash, "hex");

        if (hash.length !== storedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(hash, storedBuffer);
    } catch (error) {
        return false;
    }
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ============================================================
// DATABASE CONNECTION
// ============================================================

const db = new sqlite3.Database(
    path.join(__dirname, "career_guidance.db"),
    (err) => {
        if (err) {
            console.error(
                "Database connection error:",
                err.message
            );
        } else {
            console.log(
                "Connected to SQLite database."
            );
        }
    }
);


// ============================================================
// GENERAL HELPER FUNCTIONS
// ============================================================

function parseJSON(value) {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parsed;
        }

        return [];
    } catch {
        return [];
    }
}


function stringifyJSON(value) {
    if (value === undefined || value === null) {
        return "[]";
    }

    if (typeof value === "string") {
        try {
            JSON.parse(value);
            return value;
        } catch {
            return JSON.stringify([value]);
        }
    }

    return JSON.stringify(value);
}


// ============================================================
// ADMIN PASSWORD SECURITY
// ============================================================

function hashAdminPassword(password, salt) {
    return crypto
        .scryptSync(password, salt, 64)
        .toString("hex");
}


function createAdminPasswordHash(password) {
    const salt = crypto
        .randomBytes(16)
        .toString("hex");

    const hash = hashAdminPassword(
        password,
        salt
    );

    return {
        salt: salt,
        hash: hash
    };
}


function verifyAdminPassword(
    password,
    storedHash,
    storedSalt
) {
    try {
        const hash = hashAdminPassword(
            password,
            storedSalt
        );

        const storedBuffer =
            Buffer.from(storedHash, "hex");

        const hashBuffer =
            Buffer.from(hash, "hex");

        if (
            storedBuffer.length !==
            hashBuffer.length
        ) {
            return false;
        }

        return crypto.timingSafeEqual(
            storedBuffer,
            hashBuffer
        );
    } catch {
        return false;
    }
}


// ============================================================
// COOKIE HELPER
// ============================================================

function getCookie(req, name) {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
        return null;
    }

    const cookies = {};

    cookieHeader
        .split(";")
        .forEach(cookie => {
            const parts = cookie.trim().split("=");

            const key = parts.shift();

            if (!key) {
                return;
            }

            cookies[key] = decodeURIComponent(
                parts.join("=")
            );
        });

    return cookies[name] || null;
}


// ============================================================
// ADMIN SESSION CHECK
// ============================================================

function getAdminFromSession(req, callback) {
    const token = getCookie(
        req,
        "career_admin_session"
    );

    if (!token) {
        return callback(null, null);
    }

    const sql = `
        SELECT
            admins.id,
            admins.full_name,
            admins.email
        FROM admin_sessions
        INNER JOIN admins
            ON admins.id = admin_sessions.admin_id
        WHERE admin_sessions.session_token = ?
    `;

    db.get(
        sql,
        [token],
        (err, admin) => {
            if (err) {
                return callback(err);
            }

            callback(null, admin || null);
        }
    );
}


// ============================================================
// ADMIN API PROTECTION
// ============================================================

function requireAdmin(req, res, next) {
    getAdminFromSession(
        req,
        (err, admin) => {

            if (err) {
                console.error(
                    "Admin authentication error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Authentication error."
                });
            }

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Admin login required."
                });
            }

            req.admin = admin;

            next();
        }
    );
}


// ============================================================
// CREATE ADMIN TABLES
// ============================================================

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, err => {
        if (err) {
            console.error(
                "Admins table error:",
                err.message
            );
        } else {
            console.log(
                "Admins table ready."
            );
        }
    });


    db.run(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(admin_id)
                REFERENCES admins(id)
        )
    `, err => {
        if (err) {
            console.error(
                "Admin sessions table error:",
                err.message
            );
        } else {
            console.log(
                "Admin sessions table ready."
            );
        }
    });


    // --------------------------------------------------------
    // CREATE DEFAULT ADMIN
    // --------------------------------------------------------

    const adminEmail =
        "admin@careerguide.com";

    const adminPassword =
        "Admin@123";

    db.get(
        `
        SELECT id
        FROM admins
        WHERE email = ?
        `,
        [adminEmail],
        (err, existingAdmin) => {

            if (err) {
                console.error(
                    "Admin check error:",
                    err.message
                );

                return;
            }

            if (existingAdmin) {
                console.log(
                    "Default admin already exists."
                );

                return;
            }

            const passwordData =
                createAdminPasswordHash(
                    adminPassword
                );

            db.run(
                `
                INSERT INTO admins
                (
                    full_name,
                    email,
                    password_hash,
                    password_salt
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    "System Administrator",
                    adminEmail,
                    passwordData.hash,
                    passwordData.salt
                ],
                function (insertErr) {

                    if (insertErr) {
                        console.error(
                            "Default admin creation error:",
                            insertErr.message
                        );

                        return;
                    }

                    console.log(
                        "Default admin created."
                    );
                }
            );
        }
    );
});


// ============================================================
// VALID SKILLS
// ============================================================

const VALID_SKILLS = [
    "Programming",
    "Communication",
    "Design",
    "Data Analysis",
    "Management",
    "Writing",
    "Research",
    "SEO",
    "Digital Marketing",
    "Social Media Marketing",
    "Content Writing",
    "Problem Solving",
    "HTML",
    "CSS",
    "JavaScript",
    "Git",
    "GitHub",
    "UI/UX",
    "Graphic Design",
    "Microsoft Office",
    "Excel",
    "Google Analytics"
];


// ============================================================
// USERS TABLE
// ============================================================

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        password_salt TEXT
    )
`, err => {

    if (err) {
        console.error(
            "Users table error:",
            err.message
        );
    } else {
        console.log(
            "Users table ready."
        );

        // Add password_salt to an existing database
        // if the column does not already exist.
        db.all(
            `PRAGMA table_info(users)`,
            [],
            (pragmaErr, columns) => {

                if (pragmaErr) {
                    console.error(
                        "Users table check error:",
                        pragmaErr.message
                    );
                    return;
                }

                const hasPasswordSalt = columns.some(
                    column => column.name === "password_salt"
                );

                if (!hasPasswordSalt) {

                    db.run(
                        `ALTER TABLE users ADD COLUMN password_salt TEXT`,
                        alterErr => {

                            if (alterErr) {
                                console.error(
                                    "Password salt column error:",
                                    alterErr.message
                                );
                            } else {
                                console.log(
                                    "Password salt column added."
                                );
                            }
                        }
                    );

                } else {

                    console.log(
                        "Password salt column already exists."
                    );
                }
            }
        );
    }
});


// ============================================================
// PROFILES TABLE
// ============================================================

db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        qualification TEXT,
        field TEXT,
        interest TEXT,
        skills TEXT,
        FOREIGN KEY(user_id)
            REFERENCES users(id)
    )
`, err => {

    if (err) {
        console.error(
            "Profiles table error:",
            err.message
        );
    } else {
        console.log(
            "Profiles table ready."
        );
    }
});


// ============================================================
// CAREERS TABLE
// ============================================================

db.run(`
    CREATE TABLE IF NOT EXISTS careers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        career_name TEXT UNIQUE NOT NULL,
        minimum_qualification TEXT,
        interests TEXT,
        fields TEXT,
        skills TEXT,
        required_skills TEXT,
        timeline TEXT,
        reason TEXT,
        roadmap TEXT,
        resources TEXT
    )
`, err => {

    if (err) {
        console.error(
            "Careers table error:",
            err.message
        );

        return;
    }

    console.log(
        "Careers table ready."
    );

    updateCareerDatabase();
});


// ============================================================
// CAREER DATA
// ============================================================

const careerData = [

    // ========================================================
    // 1. AI / MACHINE LEARNING ENGINEER
    // ========================================================

    {
        career_name: "AI / Machine Learning Engineer",

        minimum_qualification: "Bachelor",

        interests: [
            "Mathematics & Data",
            "Programming",
            "Technology & Computers"
        ],

        fields: [
            "Computer Science",
            "Computer",
            "Data Science",
            "Engineering",
            "Information Technology",
            "IT",
            "Mathematics",
            "Statistics"
        ],

        skills: [
            "Machine Learning",
            "Python",
            "Programming",
            "Data Analysis",
            "Statistics"
        ],

        required_skills: [
            "Python",
            "Machine Learning",
            "Statistics",
            "Data Analysis",
            "SQL",
            "Problem Solving"
        ],

        timeline: "8–18 months",

        reason:
            "An AI / Machine Learning Engineer develops intelligent systems that learn from data and solve real-world problems.",

        roadmap: [
            "Learn Python programming",
            "Learn mathematics and statistics",
            "Learn data analysis",
            "Learn machine learning fundamentals",
            "Learn supervised and unsupervised learning",
            "Practice with real datasets",
            "Build machine learning projects",
            "Create an AI / ML portfolio",
            "Apply for internships and entry-level roles"
        ],

        resources: [
            "Google Machine Learning Crash Course",
            "Kaggle",
            "scikit-learn Documentation",
            "freeCodeCamp"
        ]
    },


    // ========================================================
    // 2. ANIMATOR
    // ========================================================

    {
        career_name: "Animator",

        minimum_qualification: "12th",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Animation",
            "Arts",
            "Design",
            "Fine Arts",
            "Graphic Design"
        ],

        skills: [
            "Animation",
            "Drawing",
            "Graphic Design",
            "Illustration"
        ],

        required_skills: [
            "Animation",
            "Drawing",
            "Illustration",
            "Storyboarding",
            "Graphic Design",
            "Video Editing"
        ],

        timeline: "6–12 months",

        reason:
            "An Animator creates moving visual content for films, games, advertisements, websites and digital media.",

        roadmap: [
            "Learn drawing fundamentals",
            "Learn animation principles",
            "Practice storyboarding",
            "Learn 2D or 3D animation software",
            "Create short animations",
            "Learn character design",
            "Build animation projects",
            "Create a showreel",
            "Build a professional portfolio"
        ],

        resources: [
            "Adobe Learn",
            "Blender",
            "Canva Design School"
        ]
    },


    // ========================================================
    // 3. ART DIRECTOR
    // ========================================================

    {
        career_name: "Art Director",

        minimum_qualification: "Bachelor",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Arts",
            "Design",
            "Fine Arts",
            "Graphic Design",
            "Mass Communication"
        ],

        skills: [
            "Art Direction",
            "Design",
            "Graphic Design",
            "Communication"
        ],

        required_skills: [
            "Design",
            "Graphic Design",
            "Art Direction",
            "Communication",
            "Typography",
            "Color Theory"
        ],

        timeline: "1–3 years",

        reason:
            "An Art Director develops the visual style and creative direction of advertising, media, branding and other creative projects.",

        roadmap: [
            "Learn design fundamentals",
            "Develop strong visual communication skills",
            "Learn typography and color theory",
            "Practice graphic design",
            "Study branding and visual identity",
            "Build creative projects",
            "Gain design experience",
            "Develop leadership skills",
            "Create a professional portfolio"
        ],

        resources: [
            "Adobe Learn",
            "Canva Design School",
            "Behance"
        ]
    },


    // ========================================================
    // 4. BUSINESS ANALYST
    // ========================================================

    {
        career_name: "Business Analyst",

        minimum_qualification: "Bachelor",

        interests: [
            "Business & Management",
            "Data Analysis",
            "Management"
        ],

        fields: [
            "Business",
            "Commerce",
            "Computer Science",
            "IT",
            "Management"
        ],

        skills: [
            "Management",
            "Data Analysis",
            "Communication"
        ],

        required_skills: [
            "Communication",
            "Data Analysis",
            "Excel",
            "Problem Solving",
            "Business Analysis",
            "Documentation"
        ],

        timeline: "6–12 months",

        reason:
            "A Business Analyst helps organizations understand problems and improve business processes.",

        roadmap: [
            "Learn business fundamentals",
            "Improve communication",
            "Learn Excel",
            "Learn data analysis",
            "Learn business analysis techniques",
            "Practice documentation",
            "Create business case studies"
        ],

        resources: [
            "IIBA",
            "Microsoft Learn",
            "Coursera"
        ]
    },


    // ========================================================
    // 5. CLOUD ENGINEER
    // ========================================================

    {
        career_name: "Cloud Engineer",

        minimum_qualification: "Bachelor",

        interests: [
            "Programming",
            "Technology & Computers"
        ],

        fields: [
            "Computer",
            "Computer Science",
            "Engineering",
            "Information Technology",
            "IT"
        ],

        skills: [
            "Cloud Computing",
            "Linux",
            "Networking",
            "Programming"
        ],

        required_skills: [
            "Cloud Computing",
            "Linux",
            "Networking",
            "Python",
            "Cybersecurity",
            "Problem Solving"
        ],

        timeline: "6–12 months",

        reason:
            "A Cloud Engineer designs, deploys and maintains applications and infrastructure on cloud platforms.",

        roadmap: [
            "Learn computer networking",
            "Learn Linux fundamentals",
            "Learn cloud computing concepts",
            "Learn AWS, Azure or Google Cloud",
            "Learn cloud security basics",
            "Practice deploying applications",
            "Learn cloud monitoring",
            "Build cloud projects",
            "Apply for cloud internships and jobs"
        ],

        resources: [
            "AWS Skill Builder",
            "Microsoft Learn",
            "Google Cloud Skills Boost"
        ]
    },


    // ========================================================
    // 6. CONTENT WRITER
    // ========================================================

    {
        career_name: "Content Writer",

        minimum_qualification: "12th",

        interests: [
            "Writing",
            "Writing & Content"
        ],

        fields: [
            "Arts",
            "English",
            "Fine Arts",
            "Journalism",
            "Mass Communication"
        ],

        skills: [
            "Research",
            "Writing"
        ],

        required_skills: [
            "Writing",
            "Grammar",
            "Research",
            "SEO",
            "Editing"
        ],

        timeline: "3–6 months",

        reason:
            "A Content Writer creates written content for websites, blogs, businesses and digital platforms.",

        roadmap: [
            "Improve grammar",
            "Practice writing regularly",
            "Learn research techniques",
            "Learn basic SEO",
            "Practice editing",
            "Create writing samples",
            "Build a writing portfolio"
        ],

        resources: [
            "Grammarly",
            "HubSpot Academy",
            "Google Search Central"
        ]
    },


    // ========================================================
    // 7. CYBERSECURITY ANALYST
    // ========================================================

    {
        career_name: "Cybersecurity Analyst",

        minimum_qualification: "Bachelor",

        interests: [
            "Programming",
            "Technology & Computers"
        ],

        fields: [
            "Computer",
            "Computer Science",
            "Engineering",
            "Information Technology",
            "IT"
        ],

        skills: [
            "Cybersecurity",
            "Linux",
            "Networking",
            "Programming"
        ],

        required_skills: [
            "Cybersecurity",
            "Networking",
            "Linux",
            "Python",
            "Problem Solving",
            "Security Fundamentals"
        ],

        timeline: "6–12 months",

        reason:
            "A Cybersecurity Analyst monitors systems, identifies security threats and helps protect organizations from cyber attacks.",

        roadmap: [
            "Learn computer fundamentals",
            "Learn networking basics",
            "Learn Linux",
            "Learn cybersecurity fundamentals",
            "Learn common security threats",
            "Practice security monitoring",
            "Learn basic Python scripting",
            "Practice with cybersecurity labs",
            "Build security projects",
            "Apply for cybersecurity internships"
        ],

        resources: [
            "Cisco Networking Academy",
            "TryHackMe",
            "Microsoft Learn",
            "OWASP"
        ]
    },


    // ========================================================
    // 8. DATA ANALYST
    // ========================================================

    {
        career_name: "Data Analyst",

        minimum_qualification: "Bachelor",

        interests: [
            "Data Analysis",
            "Mathematics & Data"
        ],

        fields: [
            "Commerce",
            "Computer Science",
            "Economics",
            "IT",
            "Mathematics",
            "Statistics"
        ],

        skills: [
            "Data Analysis",
            "Excel"
        ],

        required_skills: [
            "Excel",
            "Data Analysis",
            "SQL",
            "Statistics",
            "Python",
            "Data Visualization"
        ],

        timeline: "6–12 months",

        reason:
            "A Data Analyst studies data and creates useful insights for business decisions.",

        roadmap: [
            "Learn Excel",
            "Learn SQL",
            "Learn basic statistics",
            "Learn Python for data analysis",
            "Practice data visualization",
            "Build data analysis projects",
            "Create a portfolio"
        ],

        resources: [
            "Kaggle",
            "Microsoft Learn",
            "freeCodeCamp"
        ]
    },


    // ========================================================
    // 9. DATA ENTRY OPERATOR
    // ========================================================

    {
        career_name: "Data Entry Operator",

        minimum_qualification: "12th",

        interests: [
            "Data Analysis",
            "Management"
        ],

        fields: [
            "Arts",
            "Business",
            "Commerce",
            "Management"
        ],

        skills: [
            "Data Analysis",
            "Microsoft Office"
        ],

        required_skills: [
            "Typing",
            "Excel",
            "Microsoft Office",
            "Data Accuracy",
            "Organization"
        ],

        timeline: "1–3 months",

        reason:
            "A Data Entry Operator enters, updates and maintains information accurately.",

        roadmap: [
            "Improve typing speed",
            "Learn Excel",
            "Learn Microsoft Office",
            "Practice data accuracy",
            "Learn file organization",
            "Practice real data entry tasks"
        ],

        resources: [
            "Microsoft Learn",
            "Google Workspace Learning Center"
        ]
    },


    // ========================================================
    // 10. DATA SCIENTIST
    // ========================================================

    {
        career_name: "Data Scientist",

        minimum_qualification: "Bachelor",

        interests: [
            "Data Analysis",
            "Mathematics & Data",
            "Programming"
        ],

        fields: [
            "Computer Science",
            "Data Science",
            "Economics",
            "IT",
            "Mathematics",
            "Statistics"
        ],

        skills: [
            "Data Analysis",
            "Machine Learning",
            "Python",
            "Statistics"
        ],

        required_skills: [
            "Python",
            "Statistics",
            "Data Analysis",
            "Machine Learning",
            "SQL",
            "Data Visualization"
        ],

        timeline: "8–18 months",

        reason:
            "A Data Scientist uses statistics, programming and machine learning to discover patterns and insights from data.",

        roadmap: [
            "Learn Python",
            "Learn statistics and probability",
            "Learn data analysis",
            "Learn SQL",
            "Learn data visualization",
            "Learn machine learning",
            "Practice with real datasets",
            "Build data science projects",
            "Create a portfolio",
            "Apply for internships and entry-level roles"
        ],

        resources: [
            "Kaggle",
            "Google Colab",
            "scikit-learn Documentation",
            "freeCodeCamp"
        ]
    },


    // ========================================================
    // 11. DIGITAL MARKETING SPECIALIST
    // ========================================================

    {
        career_name: "Digital Marketing Specialist",

        minimum_qualification: "12th",

        interests: [
            "Business & Management",
            "Communication",
            "Writing"
        ],

        fields: [
            "Arts",
            "Business",
            "Commerce",
            "Management",
            "Marketing"
        ],

        skills: [
            "Communication",
            "Digital Marketing",
            "SEO",
            "Writing"
        ],

        required_skills: [
            "Digital Marketing",
            "SEO",
            "Social Media Marketing",
            "Content Writing",
            "Communication",
            "Google Analytics"
        ],

        timeline: "3–6 months",

        reason:
            "A Digital Marketing Specialist promotes products and services using online marketing channels.",

        roadmap: [
            "Learn digital marketing fundamentals",
            "Learn SEO",
            "Learn social media marketing",
            "Practice content writing",
            "Learn Google Analytics",
            "Run small marketing projects",
            "Build a digital marketing portfolio"
        ],

        resources: [
            "Google Skillshop",
            "HubSpot Academy",
            "Semrush Academy"
        ]
    },


    // ========================================================
    // 12. DEVOPS ENGINEER
    // ========================================================

    {
        career_name: "DevOps Engineer",

        minimum_qualification: "Bachelor",

        interests: [
            "Programming",
            "Technology & Computers"
        ],

        fields: [
            "Computer",
            "Computer Science",
            "Engineering",
            "Information Technology",
            "IT"
        ],

        skills: [
            "Cloud Computing",
            "Git",
            "Linux",
            "Programming"
        ],

        required_skills: [
            "Linux",
            "Git",
            "Cloud Computing",
            "Python",
            "Networking",
            "Problem Solving"
        ],

        timeline: "8–15 months",

        reason:
            "A DevOps Engineer helps development and operations teams build, deploy and maintain software efficiently.",

        roadmap: [
            "Learn Linux",
            "Learn networking fundamentals",
            "Learn Git and GitHub",
            "Learn Python or scripting",
            "Learn cloud computing",
            "Learn CI/CD concepts",
            "Learn containers and Docker",
            "Practice deployment automation",
            "Build DevOps projects",
            "Apply for DevOps internships"
        ],

        resources: [
            "Docker Documentation",
            "AWS Skill Builder",
            "Microsoft Learn",
            "GitHub Skills"
        ]
    },


    // ========================================================
    // 13. FASHION DESIGNER
    // ========================================================

    {
        career_name: "Fashion Designer",

        minimum_qualification: "12th",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Arts",
            "Design",
            "Fine Arts",
            "Fashion Design"
        ],

        skills: [
            "Design",
            "Drawing",
            "Fashion Design",
            "Illustration"
        ],

        required_skills: [
            "Fashion Design",
            "Drawing",
            "Illustration",
            "Color Theory",
            "Textile Knowledge",
            "Design"
        ],

        timeline: "6–18 months",

        reason:
            "A Fashion Designer creates clothing, accessories and fashion concepts based on design, materials and customer preferences.",

        roadmap: [
            "Learn fashion design fundamentals",
            "Practice fashion illustration",
            "Learn color theory",
            "Study fabrics and textiles",
            "Learn garment construction basics",
            "Create fashion design concepts",
            "Build a fashion portfolio",
            "Create sample collections",
            "Apply for internships or freelance opportunities"
        ],

        resources: [
            "Adobe Learn",
            "Canva Design School",
            "Fashionary"
        ]
    },


    // ========================================================
    // 14. FINE ARTIST
    // ========================================================

    {
        career_name: "Fine Artist",

        minimum_qualification: "12th",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Arts",
            "Fine Arts"
        ],

        skills: [
            "Drawing",
            "Painting",
            "Illustration"
        ],

        required_skills: [
            "Drawing",
            "Painting",
            "Illustration",
            "Color Theory",
            "Composition",
            "Art Techniques"
        ],

        timeline: "6–18 months",

        reason:
            "A Fine Artist creates original artwork using mediums such as drawing, painting, sculpture and mixed media.",

        roadmap: [
            "Learn drawing fundamentals",
            "Practice observation and sketching",
            "Learn color theory",
            "Explore painting techniques",
            "Study composition",
            "Experiment with different art mediums",
            "Create original artwork",
            "Build an art portfolio",
            "Participate in exhibitions and creative opportunities"
        ],

        resources: [
            "Tate Learn",
            "MoMA Learning",
            "Adobe Learn"
        ]
    },


    // ========================================================
    // 15. GRAPHIC DESIGNER
    // ========================================================

    {
        career_name: "Graphic Designer",

        minimum_qualification: "12th",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Animation",
            "Arts",
            "Design",
            "Fine Arts",
            "Graphic Design"
        ],

        skills: [
            "Design",
            "Graphic Design"
        ],

        required_skills: [
            "Graphic Design",
            "Design",
            "Typography",
            "Color Theory",
            "Figma",
            "Photoshop"
        ],

        timeline: "4–8 months",

        reason:
            "A Graphic Designer creates visual content for brands, businesses and digital media.",

        roadmap: [
            "Learn design principles",
            "Learn typography",
            "Learn color theory",
            "Learn graphic design software",
            "Practice logo and poster design",
            "Create portfolio projects",
            "Apply for design internships"
        ],

        resources: [
            "Adobe Learn",
            "Canva Design School",
            "Figma Learn"
        ]
    },


    // ========================================================
    // 16. ILLUSTRATOR
    // ========================================================

    {
        career_name: "Illustrator",

        minimum_qualification: "12th",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Animation",
            "Arts",
            "Design",
            "Fine Arts",
            "Graphic Design"
        ],

        skills: [
            "Drawing",
            "Illustration",
            "Graphic Design"
        ],

        required_skills: [
            "Drawing",
            "Illustration",
            "Digital Art",
            "Color Theory",
            "Composition",
            "Graphic Design"
        ],

        timeline: "4–12 months",

        reason:
            "An Illustrator creates drawings and visual artwork for books, advertising, media, products and digital platforms.",

        roadmap: [
            "Practice drawing regularly",
            "Learn illustration fundamentals",
            "Learn color theory",
            "Practice composition",
            "Learn digital illustration tools",
            "Develop a personal art style",
            "Create illustration projects",
            "Build an illustration portfolio",
            "Find freelance or professional opportunities"
        ],

        resources: [
            "Adobe Learn",
            "Procreate",
            "Canva Design School"
        ]
    },


    // ========================================================
    // 17. INTERIOR DESIGNER
    // ========================================================

    {
        career_name: "Interior Designer",

        minimum_qualification: "Bachelor",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Arts",
            "Design",
            "Fine Arts",
            "Interior Design"
        ],

        skills: [
            "Design",
            "Drawing",
            "Interior Design"
        ],

        required_skills: [
            "Interior Design",
            "Drawing",
            "Space Planning",
            "Color Theory",
            "3D Design",
            "Communication"
        ],

        timeline: "6–18 months",

        reason:
            "An Interior Designer plans and designs functional and attractive indoor spaces for homes, offices and commercial environments.",

        roadmap: [
            "Learn design fundamentals",
            "Learn space planning",
            "Learn color theory",
            "Practice technical drawing",
            "Learn interior design software",
            "Learn 3D visualization",
            "Create room design projects",
            "Build an interior design portfolio",
            "Apply for internships or freelance projects"
        ],

        resources: [
            "Autodesk Learning",
            "SketchUp Campus",
            "Adobe Learn"
        ]
    },


    // ========================================================
    // 18. OFFICE ASSISTANT
    // ========================================================

    {
        career_name: "Office Assistant",

        minimum_qualification: "12th",

        interests: [
            "Communication",
            "Management"
        ],

        fields: [
            "Arts",
            "Business",
            "Commerce",
            "Management"
        ],

        skills: [
            "Communication",
            "Management",
            "Microsoft Office"
        ],

        required_skills: [
            "Communication",
            "Microsoft Office",
            "Excel",
            "Organization",
            "Time Management"
        ],

        timeline: "1–3 months",

        reason:
            "An Office Assistant supports daily administrative and office operations.",

        roadmap: [
            "Learn Microsoft Office",
            "Improve communication",
            "Learn Excel basics",
            "Improve organization skills",
            "Practice office documentation",
            "Learn email communication",
            "Apply for office assistant roles"
        ],

        resources: [
            "Microsoft Learn",
            "Google Workspace Learning Center"
        ]
    },


    // ========================================================
    // 19. PHOTOGRAPHER
    // ========================================================

    {
        career_name: "Photographer",

        minimum_qualification: "12th",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Arts",
            "Design",
            "Fine Arts",
            "Mass Communication"
        ],

        skills: [
            "Photography",
            "Photo Editing"
        ],

        required_skills: [
            "Photography",
            "Photo Editing",
            "Composition",
            "Lighting",
            "Color Theory",
            "Communication"
        ],

        timeline: "3–12 months",

        reason:
            "A Photographer creates professional images for events, products, businesses, media and creative projects.",

        roadmap: [
            "Learn camera fundamentals",
            "Learn composition",
            "Learn lighting",
            "Practice different photography styles",
            "Learn photo editing",
            "Create photography projects",
            "Build a photography portfolio",
            "Create an online portfolio",
            "Find freelance or professional opportunities"
        ],

        resources: [
            "Adobe Learn",
            "Nikon School",
            "Canon Learning"
        ]
    },


    // ========================================================
    // 20. SALES ASSOCIATE
    // ========================================================

    {
        career_name: "Sales Associate",

        minimum_qualification: "12th",

        interests: [
            "Business & Management",
            "Communication"
        ],

        fields: [
            "Arts",
            "Business",
            "Commerce",
            "Management"
        ],

        skills: [
            "Communication",
            "Management"
        ],

        required_skills: [
            "Communication",
            "Sales",
            "Customer Service",
            "Negotiation",
            "Product Knowledge"
        ],

        timeline: "1–3 months",

        reason:
            "A Sales Associate helps customers and contributes to business sales.",

        roadmap: [
            "Improve communication",
            "Learn sales techniques",
            "Learn customer service",
            "Practice negotiation",
            "Understand products",
            "Gain sales experience"
        ],

        resources: [
            "HubSpot Academy",
            "Salesforce Trailhead"
        ]
    },


    // ========================================================
    // 21. SOFTWARE DEVELOPER
    // ========================================================

    {
        career_name: "Software Developer",

        minimum_qualification: "Bachelor",

        interests: [
            "Programming",
            "Technology & Computers"
        ],

        fields: [
            "Computer",
            "Computer Science",
            "Engineering",
            "Information Technology",
            "IT"
        ],

        skills: [
            "Git",
            "Problem Solving",
            "Programming"
        ],

        required_skills: [
            "Programming",
            "Python",
            "Java",
            "Git",
            "SQL",
            "Problem Solving"
        ],

        timeline: "6–12 months",

        reason:
            "A Software Developer designs, builds, tests and maintains software applications.",

        roadmap: [
            "Learn programming fundamentals",
            "Learn Python or Java",
            "Learn data structures and algorithms",
            "Learn SQL and databases",
            "Learn Git and GitHub",
            "Build software projects",
            "Learn software development practices",
            "Create a project portfolio",
            "Apply for internships and jobs"
        ],

        resources: [
            "freeCodeCamp",
            "MDN Web Docs",
            "GitHub Skills",
            "Oracle Java Tutorials"
        ]
    },


    // ========================================================
    // 22. UI/UX DESIGNER
    // ========================================================

    {
        career_name: "UI/UX Designer",

        minimum_qualification: "Bachelor",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Animation",
            "Arts",
            "Design",
            "Fine Art",
            "Graphic Design"
        ],

        skills: [
            "Design",
            "UI/UX"
        ],

        required_skills: [
            "UI/UX",
            "Design",
            "Figma",
            "Wireframing",
            "Prototyping",
            "Communication"
        ],

        timeline: "4–8 months",

        reason:
            "A UI/UX Designer creates user-friendly and visually attractive digital experiences.",

        roadmap: [
            "Learn design principles",
            "Learn Figma",
            "Practice wireframing",
            "Learn prototyping",
            "Study user research",
            "Create UI/UX case studies",
            "Build a design portfolio"
        ],

        resources: [
            "Figma Learn",
            "Google UX Design resources",
            "Interaction Design Foundation"
        ]
    },


    // ========================================================
    // 23. VIDEO EDITOR
    // ========================================================

    {
        career_name: "Video Editor",

        minimum_qualification: "12th",

        interests: [
            "Art & Design",
            "Design"
        ],

        fields: [
            "Arts",
            "Design",
            "Fine Arts",
            "Mass Communication"
        ],

        skills: [
            "Video Editing",
            "Graphic Design"
        ],

        required_skills: [
            "Video Editing",
            "Storytelling",
            "Audio Editing",
            "Color Grading",
            "Graphic Design",
            "Communication"
        ],

        timeline: "3–9 months",

        reason:
            "A Video Editor creates and edits video content for films, social media, advertisements, businesses and digital platforms.",

        roadmap: [
            "Learn video editing fundamentals",
            "Learn editing software",
            "Learn storytelling",
            "Learn audio editing",
            "Learn color correction",
            "Practice short-form video editing",
            "Create video projects",
            "Build a video showreel",
            "Create a professional portfolio"
        ],

        resources: [
            "Adobe Learn",
            "DaVinci Resolve Training",
            "Blackmagic Design"
        ]
    },


    // ========================================================
    // 24. WEB DEVELOPER
    // ========================================================

    {
        career_name: "Web Developer",

        minimum_qualification: "Bachelor",

        interests: [
            "Programming",
            "Technology & Computers"
        ],

        fields: [
            "Computer",
            "Computer Science",
            "Engineering",
            "Information Technology",
            "IT"
        ],

        skills: [
            "Programming"
        ],

        required_skills: [
            "HTML",
            "CSS",
            "JavaScript",
            "Git",
            "GitHub",
            "Problem Solving"
        ],

        timeline: "6–12 months",

        reason:
            "A Web Developer creates and maintains websites and web applications.",

        roadmap: [
            "Learn HTML and CSS",
            "Learn JavaScript",
            "Learn Git and GitHub",
            "Build responsive websites",
            "Learn a frontend framework",
            "Create portfolio projects",
            "Apply for internships and jobs"
        ],

        resources: [
            "MDN Web Docs",
            "freeCodeCamp",
            "JavaScript.info"
        ]
    },


    // ========================================================
    // 25. RETAIL ASSOCIATE
    // ========================================================

    {
        career_name: "Retail Associate",

        minimum_qualification: "12th",

        interests: [
            "Business & Management",
            "Communication"
        ],

        fields: [
            "Arts",
            "Business",
            "Commerce",
            "Management"
        ],

        skills: [
            "Communication"
        ],

        required_skills: [
            "Communication",
            "Customer Service",
            "Sales",
            "Product Knowledge",
            "Problem Solving"
        ],

        timeline: "1–3 months",

        reason:
            "A Retail Associate assists customers and supports daily store operations.",

        roadmap: [
            "Improve communication",
            "Learn customer service",
            "Learn basic sales",
            "Understand product knowledge",
            "Practice problem solving",
            "Gain retail experience"
        ],

        resources: [
            "Customer service training",
            "Sales training resources"
        ]
    }

];


// ============================================================
// UPDATE CAREER DATABASE
// ============================================================

function updateCareerDatabase() {

    careerData.forEach(career => {

        db.get(
            `
            SELECT id
            FROM careers
            WHERE career_name = ?
            `,
            [career.career_name],
            (err, existing) => {

                if (err) {
                    console.error(
                        "Career check error:",
                        err.message
                    );

                    return;
                }

                const values = [
                    career.minimum_qualification,
                    JSON.stringify(
                        career.interests
                    ),
                    JSON.stringify(
                        career.fields
                    ),
                    JSON.stringify(
                        career.skills
                    ),
                    JSON.stringify(
                        career.required_skills
                    ),
                    career.timeline,
                    career.reason,
                    JSON.stringify(
                        career.roadmap
                    ),
                    JSON.stringify(
                        career.resources
                    )
                ];


                if (existing) {

                    db.run(
                        `
                        UPDATE careers
                        SET
                            minimum_qualification = ?,
                            interests = ?,
                            fields = ?,
                            skills = ?,
                            required_skills = ?,
                            timeline = ?,
                            reason = ?,
                            roadmap = ?,
                            resources = ?
                        WHERE career_name = ?
                        `,
                        [
                            ...values,
                            career.career_name
                        ],
                        updateErr => {

                            if (updateErr) {
                                console.error(
                                    "Career update error:",
                                    updateErr.message
                                );
                            }
                        }
                    );

                } else {

                    db.run(
                        `
                        INSERT INTO careers
                        (
                            career_name,
                            minimum_qualification,
                            interests,
                            fields,
                            skills,
                            required_skills,
                            timeline,
                            reason,
                            roadmap,
                            resources
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `,
                        [
                            career.career_name,
                            ...values
                        ],
                        insertErr => {

                            if (insertErr) {
                                console.error(
                                    "Career insert error:",
                                    insertErr.message
                                );
                            }
                        }
                    );
                }
            }
        );
    });

    console.log(
        "Career database populated."
    );
}


// ============================================================
// HOME ROUTE
// ============================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "index.html")
    );
});

// ============================================================
// USER REGISTER
// ============================================================

app.post("/api/register", (req, res) => {

    const {
        fullName,
        email,
        password
    } = req.body;

    if (
        !fullName ||
        !email ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message:
                "All fields are required."
        });
    }

    // Basic password length validation
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message:
                "Password must be at least 6 characters long."
        });
    }

    // Create a secure password hash and unique salt
    const passwordData = hashUserPassword(password);

    db.run(
        `
        INSERT INTO users
        (
            full_name,
            email,
            password,
            password_salt
        )
        VALUES (?, ?, ?, ?)
        `,
        [
            fullName.trim(),
            email.trim().toLowerCase(),
            passwordData.hash,
            passwordData.salt
        ],
        function (err) {

            if (err) {

                if (
                    err.message.includes(
                        "UNIQUE"
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Email already registered."
                    });
                }

                console.error(
                    "Registration error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Registration failed."
                });
            }

            res.json({
                success: true,
                message:
                    "Registration successful.",
                userId: this.lastID
            });
        }
    );
});


// ============================================================
// USER LOGIN
// ============================================================

app.post("/api/login", (req, res) => {

    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message:
                "Email and password are required."
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    db.get(
        `
        SELECT
            id,
            full_name,
            email,
            password,
            password_salt
        FROM users
        WHERE email = ?
        `,
        [cleanEmail],
        (err, user) => {

            if (err) {
                console.error(
                    "Login error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Login failed."
                });
            }

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });
            }

            // ====================================================
            // NEW SECURE PASSWORD
            // ====================================================

            if (user.password_salt) {

                const passwordCorrect =
                    verifyUserPassword(
                        password,
                        user.password,
                        user.password_salt
                    );

                if (!passwordCorrect) {
                    return res.status(401).json({
                        success: false,
                        message:
                            "Invalid email or password."
                    });
                }

            }

            // ====================================================
            // OLD PASSWORD MIGRATION
            // ====================================================
            // Existing users were created before password
            // hashing was added. If their password_salt is empty,
            // check their old password and automatically upgrade it.

            else {

                if (user.password !== password) {
                    return res.status(401).json({
                        success: false,
                        message:
                            "Invalid email or password."
                    });
                }

                const passwordData =
                    hashUserPassword(password);

                db.run(
                    `
                    UPDATE users
                    SET
                        password = ?,
                        password_salt = ?
                    WHERE id = ?
                    `,
                    [
                        passwordData.hash,
                        passwordData.salt,
                        user.id
                    ],
                    updateErr => {

                        if (updateErr) {
                            console.error(
                                "Password migration error:",
                                updateErr.message
                            );
                        } else {
                            console.log(
                                `Password securely upgraded for user ID ${user.id}.`
                            );
                        }
                    }
                );
            }

            // ====================================================
            // LOGIN SUCCESS
            // ====================================================

            res.json({
                success: true,
                message:
                    "Login successful.",
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email
                }
            });
        }
    );
});

// ============================================================
// GET USER SESSION
// ============================================================

app.get(
    "/api/session/:userId",
    (req, res) => {

        const userId =
            req.params.userId;

        db.get(
            `
            SELECT
                id,
                full_name,
                email
            FROM users
            WHERE id = ?
            `,
            [userId],
            (err, user) => {

                if (err) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to check session."
                    });
                }

                if (!user) {
                    return res.json({
                        success: false,
                        loggedIn: false
                    });
                }

                res.json({
                    success: true,
                    loggedIn: true,
                    user: user
                });
            }
        );
    }
);


// ============================================================
// SAVE PROFILE
// ============================================================

app.post("/api/profile", (req, res) => {

    const {
        userId,
        qualification,
        field,
        interest,
        skills
    } = req.body;
    
    console.log("PROFILE SKILLS RECEIVED:", skills);

    if (!userId) {
        return res.status(400).json({
            success: false,
            message:
                "User ID is required."
        });
    }

    let skillsValue = [];

    if (Array.isArray(skills)) {
        skillsValue = skills;
    }

    else if (
        typeof skills === "string" &&
        skills.trim() !== ""
    ) {
        try {

            const parsed =
                JSON.parse(skills);

            if (Array.isArray(parsed)) {
                skillsValue = parsed;
            } else {
                skillsValue = [skills];
            }

        } catch {
            skillsValue = [skills];
        }
    }

    // Keep only valid skills when possible
    skillsValue = skillsValue.filter(
        skill => {
            if (
                typeof skill === "string"
            ) {
                return true;
            }

            if (
                skill &&
                typeof skill === "object"
            ) {
                return true;
            }

            return false;
        }
    );

    const skillsJson =
        JSON.stringify(skillsValue);

    db.run(
        `
        INSERT INTO profiles
        (
            user_id,
            qualification,
            field,
            interest,
            skills
        )
        VALUES (?, ?, ?, ?, ?)

        ON CONFLICT(user_id)
        DO UPDATE SET
            qualification =
                excluded.qualification,

            field =
                excluded.field,

            interest =
                excluded.interest,

            skills =
                excluded.skills
        `,
        [
            userId,
            qualification || "",
            field || "",
            interest || "",
            skillsJson
        ],
        function (err) {

            if (err) {
                console.error(
                    "Profile save error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to save profile."
                });
            }

            res.json({
                success: true,
                message:
                    "Profile saved successfully."
            });
        }
    );
});


// ============================================================
// GET PROFILE
// ============================================================

app.get(
    "/api/profile/:userId",
    (req, res) => {

        const userId =
            req.params.userId;

        db.get(
            `
            SELECT
                id,
                user_id,
                qualification,
                field,
                interest,
                skills
            FROM profiles
            WHERE user_id = ?
            `,
            [userId],
            (err, profile) => {

                if (err) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to load profile."
                    });
                }

                if (!profile) {
                    return res.json({
                        success: true,
                        profile: null
                    });
                }

                let skills = [];

                try {
                    skills =
                        JSON.parse(
                            profile.skills ||
                            "[]"
                        );
                } catch {
                    skills = [];
                }

                profile.skills =
                    skills;

                res.json({
                    success: true,
                    profile: profile
                });
            }
        );
    }
);


// ============================================================
// GET CAREERS
// ============================================================

app.get(
    "/api/careers",
    (req, res) => {

        db.all(
            `
            SELECT *
            FROM careers
            ORDER BY career_name COLLATE NOCASE ASC
            `,
            [],
            (err, careers) => {

                if (err) {
                    console.error(
                        "Career fetch error:",
                        err.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to load careers."
                    });
                }

                const formattedCareers =
                    careers.map(
                        career => ({
                            ...career,

                            interests:
                                parseJSON(
                                    career.interests
                                ),

                            fields:
                                parseJSON(
                                    career.fields
                                ),

                            skills:
                                parseJSON(
                                    career.skills
                                ),

                            required_skills:
                                parseJSON(
                                    career.required_skills
                                ),

                            roadmap:
                                parseJSON(
                                    career.roadmap
                                ),

                            resources:
                                parseJSON(
                                    career.resources
                                )
                        })
                    );

                res.json({
                    success: true,
                    careers:
                        formattedCareers
                });
            }
        );
    }
);


// ============================================================
// CAREER RECOMMENDATION API
// ============================================================

function normalizeMatchText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, " ");
}

function parseJsonArray(value) {
    try {
        const parsed = JSON.parse(value || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function getProfileSkillNames(skills) {

    const skillList = parseJsonArray(skills);

    return skillList
        .map(skill => {

            if (typeof skill === "string") {

                return {
                    name: skill,
                    level: "Beginner"
                };
            }

            if (skill && typeof skill === "object") {

                return {
                    name: skill.name || "",
                    level: skill.level || "Beginner"
                };
            }

            return null;
        })
        .filter(skill => skill && skill.name);
}

function getQualificationLevel(value) {
    const text = normalizeMatchText(value);

    if (text.includes("master")) {
        return 5;
    }

    if (text.includes("bachelor")) {
        return 4;
    }

    if (text.includes("diploma")) {
        return 3;
    }

    if (text.includes("12th") || text.includes("twelfth")) {
        return 2;
    }

    if (text.includes("10th") || text.includes("tenth")) {
        return 1;
    }

    return 0;
}

function calculateCareerMatch(profile, career) {

    const userInterest =
        normalizeMatchText(profile.interest);

    const userField =
        normalizeMatchText(profile.field);

    const userQualification =
        getQualificationLevel(profile.qualification);


    // --------------------------------------------------------
    // USER SKILLS WITH PROFICIENCY LEVEL
    // --------------------------------------------------------

    let profileSkills = [];

    try {
        profileSkills = JSON.parse(profile.skills || "[]");
    } catch (error) {
        profileSkills = [];
    }

    const userSkills = profileSkills.map(skill => {

        if (typeof skill === "string") {
            return {
                name: normalizeMatchText(skill),
                level: "Beginner"
            };
        }

        return {
            name: normalizeMatchText(skill.name),
            level: skill.level || "Beginner"
        };
    });


    // --------------------------------------------------------
    // CAREER DATA
    // --------------------------------------------------------

    const careerInterests =
        parseJsonArray(career.interests)
            .map(normalizeMatchText);

    const careerFields =
        parseJsonArray(career.fields)
            .map(normalizeMatchText);

    const requiredSkills =
        parseJsonArray(career.required_skills);


    // --------------------------------------------------------
    // INTEREST SCORE - 40 POINTS
    // --------------------------------------------------------

    let interestScore = 0;

    if (userInterest) {

        const interestMatch =
            careerInterests.some(
                interest =>
                    interest === userInterest ||
                    interest.includes(userInterest) ||
                    userInterest.includes(interest)
            );

        if (interestMatch) {
            interestScore = 40;
        }
    }


    // --------------------------------------------------------
    // SKILL SCORE - 30 POINTS
    //
    // Beginner     = 50% skill credit
    // Intermediate = 75% skill credit
    // Advanced     = 100% skill credit
    // --------------------------------------------------------

    let matchedSkills = [];

    let skillPoints = 0;

    requiredSkills.forEach(requiredSkill => {

        const required =
            normalizeMatchText(requiredSkill);

        const matchingSkill =
            userSkills.find(
                userSkill =>
                    userSkill.name === required ||
                    userSkill.name.includes(required) ||
                    required.includes(userSkill.name)
            );

        if (matchingSkill) {

            matchedSkills.push(requiredSkill);

            if (
                matchingSkill.level
                    .toLowerCase() === "advanced"
            ) {
                skillPoints += 1;

            } else if (
                matchingSkill.level
                    .toLowerCase() === "intermediate"
            ) {
                skillPoints += 0.75;

            } else {
                skillPoints += 0.50;
            }
        }
    });


    let skillScore = 0;

    if (requiredSkills.length > 0) {

        skillScore = Math.round(
            (
                skillPoints /
                requiredSkills.length
            ) * 30
        );
    }


    // --------------------------------------------------------
    // FIELD SCORE - 20 POINTS
    // --------------------------------------------------------

    let fieldScore = 0;

    if (userField) {

        const fieldMatch =
            careerFields.some(
                field =>
                    field === userField ||
                    field.includes(userField) ||
                    userField.includes(field)
            );

        if (fieldMatch) {
            fieldScore = 20;
        }
    }


    // --------------------------------------------------------
    // QUALIFICATION SCORE - 10 POINTS
    // --------------------------------------------------------

    const minimumQualification =
        getQualificationLevel(
            career.minimum_qualification
        );

    let qualificationScore = 0;

    if (
        userQualification > 0 &&
        userQualification >= minimumQualification
    ) {
        qualificationScore = 10;
    }


    // --------------------------------------------------------
    // TOTAL SCORE
    // --------------------------------------------------------

    const matchPercentage =
        interestScore +
        skillScore +
        fieldScore +
        qualificationScore;


    // --------------------------------------------------------
    // MISSING SKILLS
    // --------------------------------------------------------

    const missingSkills =
        requiredSkills.filter(
            skill =>
                !matchedSkills.some(
                    matched =>
                        normalizeMatchText(matched) ===
                        normalizeMatchText(skill)
                )
        );


    // --------------------------------------------------------
    // SKILL GAPS
    // --------------------------------------------------------

    const skillGaps =
        requiredSkills.map(skill => {

            const required =
                normalizeMatchText(skill);

            const existingSkill =
                userSkills.find(
                    userSkill =>
                        userSkill.name === required ||
                        userSkill.name.includes(required) ||
                        required.includes(userSkill.name)
                );

            let currentLevel = "Not Started";

            if (existingSkill) {
                currentLevel =
                    existingSkill.level;
            }

            return {
                name: skill,
                currentLevel,
                targetLevel: "Intermediate"
            };
        });


    // --------------------------------------------------------
    // RECOMMENDATION TYPE
    // --------------------------------------------------------

    let recommendationType;

    if (matchPercentage >= 80) {

        recommendationType =
            "Excellent Match";

    } else if (matchPercentage >= 65) {

        recommendationType =
            "Good Match";

    } else if (matchPercentage >= 50) {

        recommendationType =
            "Potential Match";

    } else {

        recommendationType =
            "Explore This Career";
    }


    // --------------------------------------------------------
    // RETURN RESULT
    // --------------------------------------------------------

    return {

        careerId:
            career.id,

        careerName:
            career.career_name,

        matchPercentage,

        scoreBreakdown: {

            interestScore,

            skillScore,

            fieldScore,

            qualificationScore
        },

        minimumQualification:
            career.minimum_qualification,

        timeline:
            career.timeline,

        recommendationType,

        reason:
            career.reason,

        requiredSkills,

        matchedSkills,

        missingSkills,

        skillGaps,

        roadmap:
            parseJsonArray(career.roadmap),

        resources:
            parseJsonArray(career.resources)
    };
}


// ------------------------------------------------------------
// GET CAREER RECOMMENDATIONS
// ------------------------------------------------------------

app.get(
    "/api/recommendations/:userId",
    (req, res) => {

        const userId =
            req.params.userId;


        // ----------------------------------------------------
        // GET USER + PROFILE
        // ----------------------------------------------------

        db.get(
            `
            SELECT
                u.id,
                u.full_name,
                u.email,
                p.qualification,
                p.field,
                p.interest,
                p.skills
            FROM users u
            LEFT JOIN profiles p
                ON u.id = p.user_id
            WHERE u.id = ?
            `,
            [userId],
            (userError, user) => {

                if (userError) {

                    console.error(
                        "Recommendation user error:",
                        userError.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to load user profile."
                    });
                }


                if (!user) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "User not found."
                    });
                }


                // ------------------------------------------------
                // CHECK PROFILE
                // ------------------------------------------------

                if (
                    !user.qualification &&
                    !user.field &&
                    !user.interest &&
                    !user.skills
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Please complete your career profile first."
                    });
                }


                // ------------------------------------------------
                // GET CAREERS
                // ------------------------------------------------

                db.all(
                    `
                    SELECT *
                    FROM careers
                    ORDER BY career_name COLLATE NOCASE ASC
                    `,
                    [],
                    (careerError, careers) => {

                        if (careerError) {

                            console.error(
                                "Recommendation career error:",
                                careerError.message
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to load career database."
                            });
                        }


                        if (!careers.length) {

                            return res.status(404).json({
                                success: false,
                                message:
                                    "No careers are available."
                            });
                        }


                        // ----------------------------------------
                        // CALCULATE ALL CAREER MATCHES
                        // ----------------------------------------

                        const recommendations =
                            careers
                                .map(career =>
                                    calculateCareerMatch(
                                        user,
                                        career
                                    )
                                )
                                .sort(
                                    (a, b) =>
                                        b.matchPercentage -
                                        a.matchPercentage
                                );


                        const bestRecommendation =
                            recommendations[0];


                        // ----------------------------------------
                        // SEND RESULT TO CAREER.HTML
                        // ----------------------------------------

                        res.json({

                            success: true,

                            profile: {
                                id: user.id,
                                full_name:
                                    user.full_name,
                                email:
                                    user.email,
                                qualification:
                                    user.qualification,
                                field:
                                    user.field,
                                interest:
                                    user.interest,
                                skills:
                                    parseJsonArray(
                                        user.skills
                                    )
                            },

                            recommendation:
                                bestRecommendation,

                            recommendations:
                                recommendations.slice(0, 5)
                        });
                    }
                );
            }
        );
    }
);


// ============================================================
// ADMIN LOGIN
// ============================================================

app.post(
    "/api/admin/login",
    (req, res) => {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required."
            });
        }

        db.get(
            `
            SELECT
                id,
                full_name,
                email,
                password_hash,
                password_salt
            FROM admins
            WHERE email = ?
            `,
            [
                email.trim().toLowerCase()
            ],
            (err, admin) => {

                if (err) {
                    console.error(
                        "Admin login error:",
                        err.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Admin login failed."
                    });
                }

                if (!admin) {
                    return res.status(401).json({
                        success: false,
                        message:
                            "Invalid admin email or password."
                    });
                }

                const validPassword =
                    verifyAdminPassword(
                        password,
                        admin.password_hash,
                        admin.password_salt
                    );

                if (!validPassword) {
                    return res.status(401).json({
                        success: false,
                        message:
                            "Invalid admin email or password."
                    });
                }

                const sessionToken =
                    crypto.randomBytes(48)
                        .toString("hex");

                db.run(
                    `
                    INSERT INTO admin_sessions
                    (
                        admin_id,
                        session_token
                    )
                    VALUES (?, ?)
                    `,
                    [
                        admin.id,
                        sessionToken
                    ],
                    function (sessionErr) {

                        if (sessionErr) {
                            console.error(
                                "Admin session error:",
                                sessionErr.message
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to create admin session."
                            });
                        }

                        res.cookie(
                            "career_admin_session",
                            sessionToken,
                            {
                                httpOnly: true,
                                sameSite: "lax",
                                path: "/"
                            }
                        );

                        res.json({
                            success: true,
                            message:
                                "Admin login successful.",

                            admin: {
                                id: admin.id,
                                full_name:
                                    admin.full_name,
                                email:
                                    admin.email
                            }
                        });
                    }
                );
            }
        );
    }
);


// ============================================================
// ADMIN SESSION
// ============================================================
// IMPORTANT:
// There must be ONLY ONE route with this exact path.
// ============================================================

app.get(
    "/api/admin/session",
    (req, res) => {

        getAdminFromSession(
            req,
            (err, admin) => {

                if (err) {
                    console.error(
                        "Admin session authentication error:",
                        err.message
                    );

                    return res.status(500).json({
                        success: false,
                        loggedIn: false,
                        message:
                            "Authentication error."
                    });
                }

                if (!admin) {
                    return res.json({
                        success: true,
                        loggedIn: false
                    });
                }

                res.json({
                    success: true,
                    loggedIn: true,
                    admin: admin
                });
            }
        );
    }
);
// ============================================================
// ADMIN LOGOUT
// ============================================================

app.post(
    "/api/admin/logout",
    (req, res) => {

        const token =
            getCookie(
                req,
                "career_admin_session"
            );

        if (!token) {

            res.clearCookie(
                "career_admin_session",
                {
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/"
                }
            );

            return res.json({
                success: true,
                message:
                    "Admin logged out."
            });
        }

        db.run(
            `
            DELETE FROM admin_sessions
            WHERE session_token = ?
            `,
            [token],
            err => {

                if (err) {
                    console.error(
                        "Admin logout error:",
                        err.message
                    );
                }

                res.clearCookie(
                    "career_admin_session",
                    {
                        httpOnly: true,
                        sameSite: "lax",
                        path: "/"
                    }
                );

                res.json({
                    success: true,
                    message:
                        "Admin logged out successfully."
                });
            }
        );
    }
);


// ============================================================
// ADMIN PAGE PROTECTION
// ============================================================

function requireAdminPage(req, res, next) {

    getAdminFromSession(
        req,
        (err, admin) => {

            if (err) {

                console.error(
                    "Admin page authentication error:",
                    err.message
                );

                return res.redirect(
                    "/admin-login.html"
                );
            }

            if (!admin) {

                return res.redirect(
                    "/admin-login.html"
                );
            }

            req.admin = admin;

            next();
        }
    );
}


// ============================================================
// PROTECTED ADMIN PAGE
// ============================================================

app.get(
    "/admin.html",
    requireAdminPage,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "admin.html"
            )
        );
    }
);


// ============================================================
// PROTECTED ADMIN CAREERS PAGE
// ============================================================

app.get(
    "/admin-careers.html",
    requireAdminPage,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "admin-careers.html"
            )
        );
    }
);

// ======================================================
// ADMIN - VIEW REGISTERED USERS
// ======================================================

app.get("/api/admin/users", requireAdmin, (req, res) => {

    const sql = `
        SELECT
            users.id,
            users.full_name,
            users.email,
            profiles.qualification,
            profiles.field,
            profiles.interest,
            profiles.skills
        FROM users
        LEFT JOIN profiles
            ON users.id = profiles.user_id
        ORDER BY users.id DESC
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {

            console.error("Admin users error:", err.message);

            return res.status(500).json({
                success: false,
                message: "Unable to load users."
            });

        }

        const users = rows.map(user => {

            let skills = "";

            if (user.skills) {

                try {

                    const parsedSkills = JSON.parse(user.skills);

                    if (Array.isArray(parsedSkills)) {

                        skills = parsedSkills
                            .map(skill => {

                                if (
                                    typeof skill === "object" &&
                                    skill !== null
                                ) {

                                    const name =
                                        skill.name ||
                                        skill.skill ||
                                        "";

                                    const level =
                                        skill.level ||
                                        skill.proficiency ||
                                        "";

                                    if (name && level) {
                                        return `${name} (${level})`;
                                    }

                                    return name;
                                }

                                return skill;

                            })
                            .filter(Boolean)
                            .join(", ");

                    } else {

                        skills = String(user.skills);

                    }

                } catch (error) {

                    skills = String(user.skills);

                }

            }

            return {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                qualification: user.qualification || "",
                field: user.field || "",
                interest: user.interest || "",
                skills: skills
            };

        });

        res.json({
            success: true,
            users: users
        });

    });

});
// ============================================================
// ADMIN - GET CAREERS
// ============================================================

app.get(
    "/api/admin/careers",
    requireAdmin,
    (req, res) => {

        db.all(
            `
           SELECT *
            FROM careers
            ORDER BY career_name COLLATE NOCASE ASC
            `,
            [],
            (err, careers) => {

                if (err) {

                    console.error(
                        "Admin career fetch error:",
                        err.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to load careers."
                    });
                }

                const formattedCareers =
                    careers.map(
                        career => ({
                            ...career,

                            interests:
                                parseJSON(
                                    career.interests
                                ),

                            fields:
                                parseJSON(
                                    career.fields
                                ),

                            skills:
                                parseJSON(
                                    career.skills
                                ),

                            required_skills:
                                parseJSON(
                                    career.required_skills
                                ),

                            roadmap:
                                parseJSON(
                                    career.roadmap
                                ),

                            resources:
                                parseJSON(
                                    career.resources
                                )
                        })
                    );

                res.json({
                    success: true,
                    careers:
                        formattedCareers
                });
            }
        );
    }
);


// ============================================================
// ADMIN - ADD CAREER
// ============================================================

app.post(
    "/api/admin/careers",
    requireAdmin,
    (req, res) => {

        const {
            career_name,
            minimum_qualification,
            interests,
            fields,
            skills,
            required_skills,
            timeline,
            reason,
            roadmap,
            resources
        } = req.body;


        if (
            !career_name ||
            !minimum_qualification
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Career name and minimum qualification are required."
            });
        }


        db.get(
            `
            SELECT id
            FROM careers
            WHERE LOWER(career_name)
                = LOWER(?)
            `,
            [career_name.trim()],
            (checkErr, existing) => {

                if (checkErr) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to check career."
                    });
                }


                if (existing) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Career already exists."
                    });
                }


                db.run(
                    `
                    INSERT INTO careers
                    (
                        career_name,
                        minimum_qualification,
                        interests,
                        fields,
                        skills,
                        required_skills,
                        timeline,
                        reason,
                        roadmap,
                        resources
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        career_name.trim(),

                        minimum_qualification,

                        stringifyJSON(
                            interests
                        ),

                        stringifyJSON(
                            fields
                        ),

                        stringifyJSON(
                            skills
                        ),

                        stringifyJSON(
                            required_skills
                        ),

                        timeline || "",

                        reason || "",

                        stringifyJSON(
                            roadmap
                        ),

                        stringifyJSON(
                            resources
                        )
                    ],
                    function (err) {

                        if (err) {

                            console.error(
                                "Add career error:",
                                err.message
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to add career."
                            });
                        }


                        res.json({
                            success: true,
                            message:
                                "Career added successfully.",
                            careerId:
                                this.lastID
                        });
                    }
                );
            }
        );
    }
);


// ============================================================
// ADMIN - EDIT CAREER
// ============================================================

app.put(
    "/api/admin/careers/:id",
    requireAdmin,
    (req, res) => {

        const careerId =
            req.params.id;


        const {
            career_name,
            minimum_qualification,
            interests,
            fields,
            skills,
            required_skills,
            timeline,
            reason,
            roadmap,
            resources
        } = req.body;


        if (
            !career_name ||
            !minimum_qualification
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Career name and minimum qualification are required."
            });
        }


        db.get(
            `
            SELECT id
            FROM careers
            WHERE LOWER(career_name)
                = LOWER(?)
            AND id != ?
            `,
            [
                career_name.trim(),
                careerId
            ],
            (checkErr, existing) => {

                if (checkErr) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to check career."
                    });
                }


                if (existing) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Another career already has this name."
                    });
                }


                db.run(
                    `
                    UPDATE careers
                    SET
                        career_name = ?,
                        minimum_qualification = ?,
                        interests = ?,
                        fields = ?,
                        skills = ?,
                        required_skills = ?,
                        timeline = ?,
                        reason = ?,
                        roadmap = ?,
                        resources = ?
                    WHERE id = ?
                    `,
                    [
                        career_name.trim(),

                        minimum_qualification,

                        stringifyJSON(
                            interests
                        ),

                        stringifyJSON(
                            fields
                        ),

                        stringifyJSON(
                            skills
                        ),

                        stringifyJSON(
                            required_skills
                        ),

                        timeline || "",

                        reason || "",

                        stringifyJSON(
                            roadmap
                        ),

                        stringifyJSON(
                            resources
                        ),

                        careerId
                    ],
                    function (err) {

                        if (err) {

                            console.error(
                                "Edit career error:",
                                err.message
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to update career."
                            });
                        }


                        if (
                            this.changes === 0
                        ) {

                            return res.status(404).json({
                                success: false,
                                message:
                                    "Career not found."
                            });
                        }


                        res.json({
                            success: true,
                            message:
                                "Career updated successfully."
                        });
                    }
                );
            }
        );
    }
);


// ============================================================
// ADMIN - DELETE CAREER
// ============================================================

app.delete(
    "/api/admin/careers/:id",
    requireAdmin,
    (req, res) => {

        const careerId =
            req.params.id;


        db.run(
            `
            DELETE FROM careers
            WHERE id = ?
            `,
            [careerId],
            function (err) {

                if (err) {

                    console.error(
                        "Delete career error:",
                        err.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to delete career."
                    });
                }


                if (
                    this.changes === 0
                ) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "Career not found."
                    });
                }


                res.json({
                    success: true,
                    message:
                        "Career deleted successfully."
                });
            }
        );
    }
);


// ============================================================
// PUBLIC STATIC FILES
// ============================================================
// IMPORTANT:
// This must stay AFTER the protected admin page routes.

app.use(
    express.static(__dirname)
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "======================================"
        );
        console.log(
            " Career Guidance Portal Server"
        );
        console.log(
            "======================================"
        );

        console.log(
            `Server running at http://localhost:${PORT}`
        );

        console.log("");

        console.log(
            "Admin Login:"
        );

        console.log(
            "Email: admin@careerguide.com"
        );

        console.log(
            "Password: Admin@123"
        );

        console.log("");
    }
);