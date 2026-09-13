const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database(
    path.join(__dirname, "career_guidance.db"),
    (err) => {
        if (err) {
            console.error("Database connection error:", err.message);
        } else {
            console.log("Connected to SQLite database.");
        }
    }
);


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));


// ============================================================
// LOGIN COOKIE
// ============================================================

function getLoggedInUserId(req) {

    const cookieHeader = req.headers.cookie || "";

    const cookies = {};

    cookieHeader.split(";").forEach(cookie => {

        const parts = cookie.trim().split("=");

        if (parts.length >= 2) {

            cookies[parts[0]] = decodeURIComponent(
                parts.slice(1).join("=")
            );

        }

    });

    return cookies.career_user_id || "";
}


// ============================================================
// DATABASE TABLES
// ============================================================

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `, err => {

        if (err) {
            console.error("Users table error:", err.message);
        } else {
            console.log("Users table ready.");
        }

    });


    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            qualification TEXT,
            field TEXT,
            interest TEXT,
            skills TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `, err => {

        if (err) {
            console.error("Profiles table error:", err.message);
        } else {
            console.log("Profiles table ready.");
        }

    });


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
            console.error("Careers table error:", err.message);
        } else {
            console.log("Careers table ready.");
            checkCareerDatabase();
        }

    });

});


// ============================================================
// CAREER DATA
// ============================================================

const careers = [

    // --------------------------------------------------------
    // 1. WEB DEVELOPER
    // --------------------------------------------------------

    {
        career_name: "Web Developer",
        minimum_qualification: "Bachelor",

        interests: [
            "Technology & Computers",
            "Programming",
            "Technology",
            "Web Development"
        ],

        fields: [
            "Computer Science",
            "Information Technology",
            "IT",
            "Computer",
            "Engineering"
        ],

        skills: [
            "Programming",
            "Web Development",
            "HTML",
            "CSS",
            "JavaScript"
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
            "Good choice for students interested in technology, programming and building websites.",

        roadmap: [
            "Learn HTML",
            "Learn CSS",
            "Learn JavaScript",
            "Learn Git and GitHub",
            "Build small websites",
            "Learn backend development",
            "Create a portfolio",
            "Apply for internships and jobs"
        ],

        resources: [
            "HTML and CSS tutorials",
            "JavaScript tutorials",
            "Git and GitHub practice",
            "Frontend projects",
            "Web development projects"
        ]
    },


    // --------------------------------------------------------
    // 2. DATA ANALYST
    // --------------------------------------------------------

    {
        career_name: "Data Analyst",
        minimum_qualification: "Bachelor",

        interests: [
            "Mathematics & Data",
            "Data Analysis",
            "Technology & Computers"
        ],

        fields: [
            "Computer Science",
            "Information Technology",
            "IT",
            "Mathematics",
            "Statistics",
            "Commerce",
            "Economics"
        ],

        skills: [
            "Data Analysis",
            "Excel",
            "SQL",
            "Python",
            "Statistics"
        ],

        required_skills: [
            "Excel",
            "SQL",
            "Python",
            "Statistics",
            "Data Analysis",
            "Data Visualization"
        ],

        timeline: "6–12 months",

        reason:
            "Suitable for people who enjoy numbers, data and finding useful information from datasets.",

        roadmap: [
            "Learn Excel",
            "Learn SQL",
            "Learn statistics",
            "Learn Python for data analysis",
            "Learn data visualization",
            "Practice with datasets",
            "Build data analysis projects",
            "Create a portfolio"
        ],

        resources: [
            "Excel practice",
            "SQL tutorials",
            "Python data analysis",
            "Statistics courses",
            "Data visualization projects"
        ]
    },


    // --------------------------------------------------------
    // 3. UI/UX DESIGNER
    // --------------------------------------------------------

    {
        career_name: "UI/UX Designer",
        minimum_qualification: "Bachelor",

        interests: [
            "Art & Design",
            "Design",
            "Technology & Computers",
            "Creativity"
        ],

        fields: [
            "Fine Art",
            "Fine Arts",
            "Design",
            "Arts",
            "Graphic Design",
            "Animation",
            "Computer Science",
            "Information Technology"
        ],

        skills: [
            "UI Design",
            "UX Design",
            "Figma",
            "Graphic Design",
            "Creativity"
        ],

        required_skills: [
            "Figma",
            "UI Design",
            "UX Design",
            "Wireframing",
            "Prototyping",
            "User Research"
        ],

        timeline: "6–12 months",

        reason:
            "Suitable for creative students interested in designing websites, apps and user experiences.",

        roadmap: [
            "Learn design principles",
            "Learn Figma",
            "Learn wireframing",
            "Learn prototyping",
            "Study UX research",
            "Create mobile and website designs",
            "Build a portfolio",
            "Apply for internships"
        ],

        resources: [
            "Figma tutorials",
            "UI design practice",
            "UX design tutorials",
            "Design case studies",
            "Portfolio projects"
        ]
    },


    // --------------------------------------------------------
    // 4. BUSINESS ANALYST
    // --------------------------------------------------------

    {
        career_name: "Business Analyst",
        minimum_qualification: "Bachelor",

        interests: [
            "Business & Management",
            "Management",
            "Data Analysis",
            "Business"
        ],

        fields: [
            "Management",
            "Business",
            "Commerce",
            "Computer Science",
            "Information Technology",
            "Economics"
        ],

        skills: [
            "Business Analysis",
            "Communication",
            "Excel",
            "Problem Solving",
            "Data Analysis"
        ],

        required_skills: [
            "Business Analysis",
            "Communication",
            "Excel",
            "Problem Solving",
            "Data Analysis",
            "Requirements Analysis"
        ],

        timeline: "6–12 months",

        reason:
            "Good career for people who enjoy business problems, communication and analysing information.",

        roadmap: [
            "Learn business analysis basics",
            "Improve communication",
            "Learn Excel",
            "Learn data analysis",
            "Learn requirement gathering",
            "Practice business case studies",
            "Create sample projects",
            "Apply for internships"
        ],

        resources: [
            "Business analysis tutorials",
            "Excel",
            "Case studies",
            "Business communication",
            "Data analysis"
        ]
    },


    // --------------------------------------------------------
    // 5. DIGITAL MARKETING SPECIALIST
    // --------------------------------------------------------

    {
        career_name: "Digital Marketing Specialist",
        minimum_qualification: "12th",

        interests: [
            "Business & Management",
            "Writing & Content",
            "Communication",
            "Marketing"
        ],

        fields: [
            "Commerce",
            "Management",
            "Marketing",
            "Arts",
            "Any Field"
        ],

        skills: [
            "Digital Marketing",
            "Social Media Marketing",
            "SEO",
            "Content Writing",
            "Communication"
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
            "Suitable for people interested in marketing, communication, social media and online businesses.",

        roadmap: [
            "Learn digital marketing basics",
            "Learn SEO",
            "Learn social media marketing",
            "Learn content marketing",
            "Learn analytics",
            "Practice with sample campaigns",
            "Build a portfolio",
            "Apply for internships"
        ],

        resources: [
            "SEO tutorials",
            "Social media marketing",
            "Content marketing",
            "Google Analytics",
            "Digital marketing projects"
        ]
    },


    // --------------------------------------------------------
    // 6. CONTENT WRITER
    // --------------------------------------------------------

    {
        career_name: "Content Writer",
        minimum_qualification: "12th",

        interests: [
            "Writing & Content",
            "Writing",
            "Communication"
        ],

        fields: [
            "Arts",
            "Fine Arts",
            "Commerce",
            "Science",
            "Computer Science",
            "Information Technology",
            "Any Field"
        ],

        skills: [
            "Writing",
            "Content Writing",
            "Grammar",
            "Research",
            "SEO"
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
            "Good option for people who enjoy writing, research and creating online content.",

        roadmap: [
            "Improve grammar",
            "Practice writing",
            "Learn content writing",
            "Learn SEO",
            "Learn editing",
            "Create sample articles",
            "Build a writing portfolio",
            "Apply for writing jobs"
        ],

        resources: [
            "Writing practice",
            "Grammar resources",
            "SEO tutorials",
            "Blog writing",
            "Content writing projects"
        ]
    },


    // --------------------------------------------------------
    // 7. GRAPHIC DESIGNER
    // --------------------------------------------------------

    {
        career_name: "Graphic Designer",
        minimum_qualification: "12th",

        interests: [
            "Art & Design",
            "Design",
            "Creativity"
        ],

        fields: [
            "Fine Art",
            "Fine Arts",
            "Design",
            "Arts",
            "Graphic Design",
            "Animation"
        ],

        skills: [
            "Graphic Design",
            "Adobe Photoshop",
            "Adobe Illustrator",
            "Canva",
            "Creativity"
        ],

        required_skills: [
            "Graphic Design",
            "Photoshop",
            "Illustrator",
            "Canva",
            "Typography",
            "Creativity"
        ],

        timeline: "3–6 months",

        reason:
            "Suitable for creative students who enjoy visual design and creating graphics.",

        roadmap: [
            "Learn design principles",
            "Learn Canva",
            "Learn Photoshop",
            "Learn Illustrator",
            "Practice typography",
            "Create posters and social media designs",
            "Build a portfolio",
            "Apply for internships"
        ],

        resources: [
            "Canva",
            "Photoshop tutorials",
            "Illustrator tutorials",
            "Graphic design practice",
            "Design portfolio projects"
        ]
    },


    // --------------------------------------------------------
    // 8. OFFICE ASSISTANT
    // --------------------------------------------------------

    {
        career_name: "Office Assistant",
        minimum_qualification: "12th",

        interests: [
            "Business & Management",
            "Communication",
            "Management"
        ],

        fields: [
            "Commerce",
            "Arts",
            "Science",
            "Any Field"
        ],

        skills: [
            "Communication",
            "Microsoft Office",
            "Excel",
            "Data Entry",
            "Organization"
        ],

        required_skills: [
            "Communication",
            "Microsoft Office",
            "Excel",
            "Data Entry",
            "Organization"
        ],

        timeline: "1–3 months",

        reason:
            "Suitable for students looking for administrative and office-based work.",

        roadmap: [
            "Learn Microsoft Word",
            "Learn Excel",
            "Improve communication",
            "Learn email writing",
            "Learn office administration",
            "Practice data entry",
            "Prepare a resume",
            "Apply for office jobs"
        ],

        resources: [
            "Microsoft Office",
            "Excel",
            "Communication skills",
            "Office administration",
            "Typing practice"
        ]
    },


    // --------------------------------------------------------
    // 9. RETAIL ASSOCIATE
    // --------------------------------------------------------

    {
        career_name: "Retail Associate",
        minimum_qualification: "12th",

        interests: [
            "Business & Management",
            "Communication"
        ],

        fields: [
            "Commerce",
            "Arts",
            "Science",
            "Any Field"
        ],

        skills: [
            "Communication",
            "Customer Service",
            "Sales",
            "Teamwork"
        ],

        required_skills: [
            "Communication",
            "Customer Service",
            "Sales",
            "Teamwork",
            "Problem Solving"
        ],

        timeline: "1–3 months",

        reason:
            "Suitable for people who enjoy interacting with customers and working in a retail environment.",

        roadmap: [
            "Improve communication",
            "Learn customer service",
            "Learn basic sales",
            "Practice teamwork",
            "Learn product knowledge",
            "Prepare a resume",
            "Apply for retail positions"
        ],

        resources: [
            "Customer service training",
            "Sales basics",
            "Communication practice",
            "Retail training"
        ]
    },


    // --------------------------------------------------------
    // 10. SALES ASSOCIATE
    // --------------------------------------------------------

    {
        career_name: "Sales Associate",
        minimum_qualification: "12th",

        interests: [
            "Business & Management",
            "Communication",
            "Marketing"
        ],

        fields: [
            "Commerce",
            "Arts",
            "Science",
            "Management",
            "Any Field"
        ],

        skills: [
            "Sales",
            "Communication",
            "Customer Service",
            "Negotiation"
        ],

        required_skills: [
            "Sales",
            "Communication",
            "Customer Service",
            "Negotiation",
            "Presentation"
        ],

        timeline: "1–3 months",

        reason:
            "Good option for people who enjoy communication, convincing customers and business activities.",

        roadmap: [
            "Improve communication",
            "Learn sales basics",
            "Learn negotiation",
            "Learn customer service",
            "Practice presentations",
            "Prepare a resume",
            "Apply for sales jobs"
        ],

        resources: [
            "Sales training",
            "Communication practice",
            "Negotiation skills",
            "Customer service"
        ]
    },


    // --------------------------------------------------------
    // 11. DATA ENTRY OPERATOR
    // --------------------------------------------------------

    {
        career_name: "Data Entry Operator",
        minimum_qualification: "12th",

        interests: [
            "Mathematics & Data",
            "Data Analysis",
            "Business & Management"
        ],

        fields: [
            "Commerce",
            "Arts",
            "Science",
            "Computer Science",
            "Information Technology",
            "Any Field"
        ],

        skills: [
            "Data Entry",
            "Typing",
            "Excel",
            "Microsoft Office",
            "Accuracy"
        ],

        required_skills: [
            "Data Entry",
            "Typing",
            "Excel",
            "Microsoft Office",
            "Accuracy"
        ],

        timeline: "1–3 months",

        reason:
            "Suitable for people who prefer computer-based work involving data and accurate typing.",

        roadmap: [
            "Improve typing speed",
            "Learn Excel",
            "Learn Microsoft Office",
            "Practice data entry",
            "Improve accuracy",
            "Prepare a resume",
            "Apply for data entry jobs"
        ],

        resources: [
            "Typing practice",
            "Excel",
            "Microsoft Office",
            "Data entry practice"
        ]
    }

];


// ============================================================
// LARGE VALID SKILL LIBRARY
// ============================================================

const VALID_SKILLS = [

    // Technology
    "Programming",
    "Web Development",
    "HTML",
    "CSS",
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "C",
    "C++",
    "C#",
    "PHP",
    "SQL",
    "MySQL",
    "SQLite",
    "Node.js",
    "Express.js",
    "React",
    "Angular",
    "Vue.js",
    "Git",
    "GitHub",
    "API Development",
    "Backend Development",
    "Frontend Development",
    "Full Stack Development",
    "Software Development",
    "Software Testing",
    "Debugging",
    "Problem Solving",
    "Data Structures",
    "Algorithms",
    "Cloud Computing",
    "AWS",
    "Microsoft Azure",
    "Cybersecurity",
    "Networking",
    "Linux",
    "Database Management",
    "Computer Networking",

    // Data
    "Data Analysis",
    "Data Analytics",
    "Data Visualization",
    "Statistics",
    "Excel",
    "Microsoft Excel",
    "Power BI",
    "Tableau",
    "Machine Learning",
    "Artificial Intelligence",
    "Data Science",
    "Research",
    "Data Cleaning",
    "Data Interpretation",

    // Design
    "Graphic Design",
    "UI Design",
    "UX Design",
    "UI/UX Design",
    "Figma",
    "Adobe Photoshop",
    "Photoshop",
    "Adobe Illustrator",
    "Illustrator",
    "Canva",
    "Wireframing",
    "Prototyping",
    "User Research",
    "Typography",
    "Creativity",
    "Visual Design",
    "Brand Design",
    "Animation",
    "Video Editing",

    // Writing
    "Writing",
    "Content Writing",
    "Creative Writing",
    "Technical Writing",
    "Copywriting",
    "Blog Writing",
    "Editing",
    "Proofreading",
    "Grammar",
    "SEO",
    "Content Marketing",
    "Script Writing",
    "Storytelling",
    "Journalism",
    "Social Media Content",

    // Business
    "Business Analysis",
    "Business Management",
    "Management",
    "Digital Marketing",
    "Marketing",
    "Social Media Marketing",
    "Email Marketing",
    "Search Engine Optimization",
    "Google Analytics",
    "Market Research",
    "Brand Management",
    "Project Management",
    "Product Management",
    "Requirements Analysis",
    "Business Communication",
    "Presentation",
    "Strategic Planning",

    // Communication
    "Communication",
    "Verbal Communication",
    "Written Communication",
    "Teamwork",
    "Leadership",
    "Time Management",
    "Organization",
    "Adaptability",
    "Critical Thinking",
    "Decision Making",
    "Negotiation",
    "Interpersonal Skills",
    "Customer Service",
    "Public Speaking",

    // Office
    "Microsoft Office",
    "Microsoft Word",
    "Microsoft PowerPoint",
    "Excel",
    "Data Entry",
    "Typing",
    "Administrative Skills",
    "Office Administration",
    "Email Writing",
    "Record Keeping",
    "Documentation",
    "Scheduling",
    "Accuracy",

    // Sales
    "Sales",
    "Retail",
    "Product Knowledge",
    "Lead Generation",
    "Customer Relationship Management",
    "CRM",

    // Finance
    "Accounting",
    "Bookkeeping",
    "Financial Analysis",
    "Financial Management",
    "Tally",
    "Tally ERP",
    "Taxation",
    "Auditing",
    "Budgeting",
    "Economics",

    // Education
    "Teaching",
    "Training",
    "Lesson Planning",
    "Tutoring",
    "Classroom Management",
    "Curriculum Development",
    "Educational Technology",

    // Science
    "Scientific Research",
    "Laboratory Skills",
    "Data Collection",
    "Scientific Writing",

    // Engineering
    "AutoCAD",
    "CAD",
    "Mechanical Design",
    "Electrical Design",
    "Civil Engineering",
    "Engineering Design",
    "Project Planning",

    // Healthcare
    "Healthcare",
    "Patient Care",
    "Medical Terminology",
    "First Aid",
    "Health Education",

    // Languages
    "English",
    "Hindi",
    "Marathi",
    "French",
    "German",
    "Spanish",
    "Japanese",

    // Hospitality
    "Hospitality",
    "Hotel Management",
    "Food Service",
    "Front Office",
    "Housekeeping",
    "Event Management"

];


// ============================================================
// SKILL LOOKUP
// ============================================================

function normalizeText(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

}


const VALID_SKILL_LOOKUP = new Map(
    VALID_SKILLS.map(skill => [
        normalizeText(skill),
        skill
    ])
);


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function parseArray(value) {

    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value;
    }

    try {

        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parsed;
        }

        return [];

    } catch (error) {

        return String(value)
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);

    }

}


function parseProfileSkillObjects(skills) {

    if (!skills) {
        return [];
    }

    if (typeof skills === "string") {

        try {

            const parsed = JSON.parse(skills);

            skills =
                Array.isArray(parsed)
                    ? parsed
                    : typeof parsed === "string"
                        ? [parsed]
                        : [];

        } catch (error) {

            skills = skills
                .split(",")
                .map(item => item.trim())
                .filter(Boolean);

        }

    }

    if (!Array.isArray(skills)) {
        return [];
    }

    return skills
        .map(skill => {

            if (typeof skill === "string") {

                return {
                    name: skill.trim(),
                    level: "Beginner"
                };

            }

            return {
                name: String(
                    skill.name ||
                    skill.skill ||
                    skill.title ||
                    ""
                ).trim(),

                level:
                    skill.level ||
                    skill.value ||
                    "Beginner"
            };

        })
        .filter(skill => skill.name);

}


function getInvalidProfileSkills(skills) {

    return [
        ...new Set(

            parseProfileSkillObjects(skills)

                .filter(skill =>
                    !VALID_SKILL_LOOKUP.has(
                        normalizeText(skill.name)
                    )
                )

                .map(skill => skill.name)

        )
    ];

}


function normalizeProfileSkills(skills) {

    const skillObjects =
        parseProfileSkillObjects(skills);

    const finalSkills = [];
    const seen = new Set();

    skillObjects.forEach(skill => {

        const key =
            normalizeText(skill.name);

        // Invalid skills such as "hh" are ignored.
        if (!VALID_SKILL_LOOKUP.has(key)) {
            return;
        }

        if (seen.has(key)) {
            return;
        }

        seen.add(key);

        const canonicalName =
            VALID_SKILL_LOOKUP.get(key);

        const allowedLevels = [
            "Beginner",
            "Intermediate",
            "Advanced"
        ];

        const level =
            allowedLevels.includes(skill.level)
                ? skill.level
                : "Beginner";

        finalSkills.push({
            name: canonicalName,
            level: level
        });

    });

    return finalSkills;

}


function qualificationRank(value) {

    const qualification =
        normalizeText(value);

    if (
        qualification.includes("master") ||
        qualification.includes("postgraduate")
    ) {
        return 5;
    }

    if (
        qualification.includes("bachelor") ||
        qualification.includes("graduate")
    ) {
        return 4;
    }

    if (qualification.includes("diploma")) {
        return 3;
    }

    if (qualification.includes("12")) {
        return 2;
    }

    if (qualification.includes("10")) {
        return 1;
    }

    return 0;

}


function requiredQualificationRank(value) {

    const qualification =
        normalizeText(value);

    if (qualification.includes("master")) {
        return 5;
    }

    if (qualification.includes("bachelor")) {
        return 4;
    }

    if (qualification.includes("diploma")) {
        return 3;
    }

    if (qualification.includes("12")) {
        return 2;
    }

    if (qualification.includes("10")) {
        return 1;
    }

    return 0;

}


function textMatches(userValue, careerValues) {

    const userText =
        normalizeText(userValue);

    if (!userText) {
        return false;
    }

    return careerValues.some(value => {

        const careerText =
            normalizeText(value);

        return (
            userText === careerText ||
            userText.includes(careerText) ||
            careerText.includes(userText)
        );

    });

}


function skillLevelMultiplier(level) {

    if (level === "Advanced") {
        return 1;
    }

    if (level === "Intermediate") {
        return 0.8;
    }

    return 0.6;

}


// ============================================================
// CAREER DATABASE
// ============================================================

function checkCareerDatabase() {

    db.get(
        `SELECT COUNT(*) AS count FROM careers`,
        [],
        (err, row) => {

            if (err) {

                console.error(
                    "Career database check error:",
                    err.message
                );

                return;
            }

            if (row.count > 0) {

                console.log(
                    "Career database already contains data."
                );

                return;
            }

            const statement = db.prepare(`
                INSERT INTO careers (
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
            `);

            careers.forEach(career => {

                statement.run(
                    career.career_name,
                    career.minimum_qualification,
                    JSON.stringify(career.interests),
                    JSON.stringify(career.fields),
                    JSON.stringify(career.skills),
                    JSON.stringify(career.required_skills),
                    career.timeline,
                    career.reason,
                    JSON.stringify(career.roadmap),
                    JSON.stringify(career.resources)
                );

            });

            statement.finalize();

            console.log(
                "Career database populated."
            );

        }
    );

}


// ============================================================
// HOME
// ============================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// ============================================================
// API TEST
// ============================================================

app.get("/api/test", (req, res) => {

    res.json({
        success: true,
        message: "Career Guidance Portal API is working!"
    });

});


// ============================================================
// REGISTER
// ============================================================

app.post("/api/register", (req, res) => {

    const fullName =
        String(req.body.fullName || "").trim();

    const email =
        String(req.body.email || "")
            .trim()
            .toLowerCase();

    const password =
        String(req.body.password || "");

    if (!fullName || !email || !password) {

        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });

    }

    db.run(
        `
        INSERT INTO users (
            full_name,
            email,
            password
        )
        VALUES (?, ?, ?)
        `,
        [
            fullName,
            email,
            password
        ],
        function (err) {

            if (err) {

                if (
                    err.message &&
                    err.message.includes("UNIQUE")
                ) {

                    return res.status(409).json({
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
                    "Registration successful!",

                userId:
                    this.lastID

            });

        }
    );

});


// ============================================================
// LOGIN
// ============================================================

app.post("/api/login", (req, res) => {

    const email =
        String(req.body.email || "")
            .trim()
            .toLowerCase();

    const password =
        String(req.body.password || "");

    if (!email || !password) {

        return res.status(400).json({
            success: false,
            message:
                "Email and password are required."
        });

    }

    db.get(
        `
        SELECT id, full_name, email
        FROM users
        WHERE email = ?
        AND password = ?
        `,
        [
            email,
            password
        ],
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


            // Save logged-in user ID
            // in a browser cookie.

            res.setHeader(
                "Set-Cookie",
                `career_user_id=${encodeURIComponent(user.id)}; Path=/; SameSite=Lax`
            );


            res.json({

                success: true,

                message:
                    "Login successful!",

                // Compatibility format
                userId:
                    user.id,

                fullName:
                    user.full_name,

                email:
                    user.email,

                // Preferred format
                user: {

                    id:
                        user.id,

                    full_name:
                        user.full_name,

                    email:
                        user.email

                }

            });

        }
    );

});


// ============================================================
// CURRENT USER SESSION
// ============================================================

app.get("/api/session", (req, res) => {

    const userId =
        getLoggedInUserId(req);

    if (!userId) {

        return res.status(401).json({
            success: false,
            user: null,
            message:
                "No active session. Please login again."
        });

    }

    db.get(
        `
        SELECT id, full_name, email
        FROM users
        WHERE id = ?
        `,
        [userId],
        (err, user) => {

            if (err) {

                console.error(
                    "Session lookup error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    user: null,
                    message:
                        "Could not verify session."
                });

            }

            if (!user) {

                return res.status(404).json({
                    success: false,
                    user: null,
                    message:
                        "Session user not found."
                });

            }

            res.json({

                success: true,

                user: {

                    id:
                        user.id,

                    full_name:
                        user.full_name,

                    email:
                        user.email

                }

            });

        }
    );

});


// ============================================================
// SAVE PROFILE
// ============================================================

app.post("/api/profile", (req, res) => {

    console.log("");
    console.log("======================================");
    console.log("PROFILE SAVE REQUEST");
    console.log("======================================");
    console.log("Received body:", req.body);


    const body =
        req.body || {};


    // Try ID from frontend

    let userId =
        body.userId ||
        body.user_id ||
        body.id ||
        "";


    // Try email from frontend

    const userEmail =
        body.userEmail ||
        body.email ||
        "";


    // If frontend did not send ID,
    // try login cookie.

    if (!userId) {

        userId =
            getLoggedInUserId(req);

    }


    console.log(
        "User ID:",
        userId
    );

    console.log(
        "User Email:",
        userEmail
    );


    const qualification =
        String(
            body.qualification || ""
        ).trim();


    const field =
        String(
            body.field || ""
        ).trim();


    const interest =
        String(
            body.interest || ""
        ).trim();


    const skills =
        body.skills || [];


    // --------------------------------------------------------
    // CHECK USER
    // --------------------------------------------------------

    if (!userId && !userEmail) {

        return res.status(400).json({

            success: false,

            message:
                "Please login again before saving your profile."

        });

    }


    // --------------------------------------------------------
    // SKILL VALIDATION
    // --------------------------------------------------------

    const invalidSkills =
        getInvalidProfileSkills(
            skills
        );


    const normalizedSkills =
        normalizeProfileSkills(
            skills
        );


    // --------------------------------------------------------
    // SAVE PROFILE
    // --------------------------------------------------------

    function saveProfile(realUserId) {

        db.run(
            `
            INSERT INTO profiles (
                user_id,
                qualification,
                field,
                interest,
                skills
            )
            VALUES (?, ?, ?, ?, ?)

            ON CONFLICT(user_id)
            DO UPDATE SET
                qualification = excluded.qualification,
                field = excluded.field,
                interest = excluded.interest,
                skills = excluded.skills
            `,
            [
                realUserId,
                qualification,
                field,
                interest,
                JSON.stringify(normalizedSkills)
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
                            "Could not save profile."

                    });

                }


                console.log(
                    "Profile successfully saved for user:",
                    realUserId
                );


                res.json({

                    success: true,

                    message:
                        "Profile saved successfully!",

                    userId:
                        realUserId,

                    skills:
                        normalizedSkills,

                    invalidSkills:
                        invalidSkills

                });

            }
        );

    }


    // --------------------------------------------------------
    // FIND USER USING ID
    // --------------------------------------------------------

    if (userId) {

        db.get(
            `
            SELECT id, full_name, email
            FROM users
            WHERE id = ?
            `,
            [userId],
            (err, user) => {

                if (err) {

                    console.error(
                        "User lookup error:",
                        err.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Could not verify user."

                    });

                }


                if (user) {

                    saveProfile(
                        user.id
                    );

                    return;

                }


                // ID invalid.
                // Try email if available.

                if (userEmail) {

                    db.get(
                        `
                        SELECT id, full_name, email
                        FROM users
                        WHERE email = ?
                        `,
                        [
                            String(userEmail)
                                .trim()
                                .toLowerCase()
                        ],
                        (emailErr, emailUser) => {

                            if (emailErr) {

                                console.error(
                                    "Email lookup error:",
                                    emailErr.message
                                );

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Could not verify user."

                                });

                            }


                            if (!emailUser) {

                                return res.status(404).json({

                                    success: false,

                                    message:
                                        "User not found. Please login again."

                                });

                            }


                            saveProfile(
                                emailUser.id
                            );

                        }
                    );

                    return;

                }


                return res.status(404).json({

                    success: false,

                    message:
                        "User not found. Please login again."

                });

            }
        );

        return;

    }


    // --------------------------------------------------------
    // FIND USER USING EMAIL
    // --------------------------------------------------------

    db.get(
        `
        SELECT id, full_name, email
        FROM users
        WHERE email = ?
        `,
        [
            String(userEmail)
                .trim()
                .toLowerCase()
        ],
        (err, user) => {

            if (err) {

                console.error(
                    "Email lookup error:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Could not verify user."

                });

            }


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found. Please login again."

                });

            }


            saveProfile(
                user.id
            );

        }
    );

});


// ============================================================
// GET PROFILE
// ============================================================

app.get("/api/profile/:userId", (req, res) => {

    const userId =
        req.params.userId;


    db.get(
        `
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

        WHERE users.id = ?
        `,
        [userId],
        (err, row) => {

            if (err) {

                console.error(
                    "Get profile error:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Could not load profile."

                });

            }


            if (!row) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const skillObjects =
                normalizeProfileSkills(
                    row.skills
                );


            const invalidSkills =
                getInvalidProfileSkills(
                    row.skills
                );


            res.json({

                success: true,

                user: {

                    id:
                        row.id,

                    full_name:
                        row.full_name,

                    email:
                        row.email

                },

                profile: {

                    qualification:
                        row.qualification || "",

                    field:
                        row.field || "",

                    interest:
                        row.interest || "",

                    skills:
                        skillObjects,

                    invalidSkills:
                        invalidSkills

                }

            });

        }
    );

});


// ============================================================
// GET ALL CAREERS
// ============================================================

app.get("/api/careers", (req, res) => {

    db.all(
        `
        SELECT *
        FROM careers
        ORDER BY id
        `,
        [],
        (err, rows) => {

            if (err) {

                console.error(
                    "Get careers error:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Could not load careers."

                });

            }


            const formatted =
                rows.map(career => ({

                    id:
                        career.id,

                    career_name:
                        career.career_name,

                    minimum_qualification:
                        career.minimum_qualification,

                    interests:
                        parseArray(
                            career.interests
                        ),

                    fields:
                        parseArray(
                            career.fields
                        ),

                    skills:
                        parseArray(
                            career.skills
                        ),

                    required_skills:
                        parseArray(
                            career.required_skills
                        ),

                    timeline:
                        career.timeline,

                    reason:
                        career.reason,

                    roadmap:
                        parseArray(
                            career.roadmap
                        ),

                    resources:
                        parseArray(
                            career.resources
                        )

                }));


            res.json({

                success: true,

                careers:
                    formatted

            });

        }
    );

});


// ============================================================
// CAREER RECOMMENDATIONS
// ============================================================

app.get(
    "/api/recommendations/:userId",
    (req, res) => {

        const userId =
            req.params.userId;


        db.get(
            `
            SELECT *
            FROM profiles
            WHERE user_id = ?
            `,
            [userId],
            (profileError, profile) => {

                if (profileError) {

                    console.error(
                        "Recommendation profile error:",
                        profileError.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Could not load profile."

                    });

                }


                if (!profile) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Profile not found."

                    });

                }


                db.all(
                    `
                    SELECT *
                    FROM careers
                    ORDER BY id
                    `,
                    [],
                    (careerError, careerRows) => {

                        if (careerError) {

                            console.error(
                                "Recommendation career error:",
                                careerError.message
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Could not load careers."

                            });

                        }


                        const userSkills =
                            normalizeProfileSkills(
                                profile.skills
                            );


                        const invalidSkills =
                            getInvalidProfileSkills(
                                profile.skills
                            );


                        const userQualification =
                            qualificationRank(
                                profile.qualification
                            );


                        const results =
                            careerRows.map(career => {

                                const careerInterests =
                                    parseArray(
                                        career.interests
                                    );


                                const careerFields =
                                    parseArray(
                                        career.fields
                                    );


                                const requiredSkills =
                                    parseArray(
                                        career.required_skills
                                    );


                                // --------------------------------
                                // INTEREST = 40%
                                // --------------------------------

                                let interestScore = 0;

                                if (
                                    textMatches(
                                        profile.interest,
                                        careerInterests
                                    )
                                ) {

                                    interestScore = 40;

                                }


                                // --------------------------------
                                // FIELD = 20%
                                // --------------------------------

                                let fieldScore = 0;

                                if (
                                    textMatches(
                                        profile.field,
                                        careerFields
                                    )
                                ) {

                                    fieldScore = 20;

                                }


                                // --------------------------------
                                // QUALIFICATION = 10%
                                // --------------------------------

                                let qualificationScore = 0;

                                const requiredQualification =
                                    requiredQualificationRank(
                                        career.minimum_qualification
                                    );


                                if (
                                    userQualification >=
                                    requiredQualification
                                ) {

                                    qualificationScore = 10;

                                } else if (
                                    userQualification + 1 >=
                                    requiredQualification
                                ) {

                                    qualificationScore = 5;

                                }


                                // --------------------------------
                                // SKILLS = 30%
                                // --------------------------------

                                let skillScore = 0;

                                if (
                                    userSkills.length > 0 &&
                                    requiredSkills.length > 0
                                ) {

                                    let matchedSkillPoints = 0;


                                    requiredSkills.forEach(
                                        requiredSkill => {

                                            const matchingSkill =
                                                userSkills.find(
                                                    userSkill =>
                                                        normalizeText(
                                                            userSkill.name
                                                        ) ===
                                                        normalizeText(
                                                            requiredSkill
                                                        )
                                                );


                                            if (matchingSkill) {

                                                matchedSkillPoints +=
                                                    skillLevelMultiplier(
                                                        matchingSkill.level
                                                    );

                                            }

                                        }
                                    );


                                    skillScore =
                                        Math.min(
                                            30,
                                            (
                                                matchedSkillPoints /
                                                requiredSkills.length
                                            ) * 30
                                        );

                                }


                                // --------------------------------
                                // TOTAL SCORE
                                // --------------------------------

                                let totalScore =
                                    interestScore +
                                    skillScore +
                                    fieldScore +
                                    qualificationScore;


                                totalScore =
                                    Math.round(
                                        Math.min(
                                            100,
                                            totalScore
                                        )
                                    );


                                // --------------------------------
                                // CONFIDENCE
                                // --------------------------------

                                let confidence =
                                    "Low";


                                if (totalScore >= 75) {

                                    confidence =
                                        "High";

                                } else if (
                                    totalScore >= 50
                                ) {

                                    confidence =
                                        "Medium";

                                }


                                // --------------------------------
                                // MATCH TYPE
                                // --------------------------------

                                let recommendationType =
                                    "Explore";


                                if (totalScore >= 75) {

                                    recommendationType =
                                        "Strong Match";

                                } else if (
                                    totalScore >= 55
                                ) {

                                    recommendationType =
                                        "Good Match";

                                } else if (
                                    totalScore >= 35
                                ) {

                                    recommendationType =
                                        "Potential Match";

                                }


                                // --------------------------------
                                // MATCHED SKILLS
                                // --------------------------------

                                const matchedSkills =
                                    userSkills

                                        .filter(userSkill =>
                                            requiredSkills.some(
                                                requiredSkill =>
                                                    normalizeText(
                                                        requiredSkill
                                                    ) ===
                                                    normalizeText(
                                                        userSkill.name
                                                    )
                                            )
                                        )

                                        .map(
                                            skill =>
                                                skill.name
                                        );


                                // --------------------------------
                                // MISSING SKILLS
                                // --------------------------------

                                const missingSkills =
                                    requiredSkills.filter(
                                        requiredSkill =>
                                            !userSkills.some(
                                                userSkill =>
                                                    normalizeText(
                                                        requiredSkill
                                                    ) ===
                                                    normalizeText(
                                                        userSkill.name
                                                    )
                                            )
                                    );


                                return {

                                    career_name:
                                        career.career_name,

                                    score:
                                        totalScore,

                                    matchPercentage:
                                        totalScore,

                                    confidence:
                                        confidence,

                                    recommendationType:
                                        recommendationType,

                                    matchedSkills:
                                        matchedSkills,

                                    missingSkills:
                                        missingSkills,

                                    interestScore:
                                        Math.round(
                                            interestScore
                                        ),

                                    skillScore:
                                        Math.round(
                                            skillScore
                                        ),

                                    fieldScore:
                                        Math.round(
                                            fieldScore
                                        ),

                                    qualificationScore:
                                        qualificationScore,

                                    timeline:
                                        career.timeline,

                                    reason:
                                        career.reason,

                                    roadmap:
                                        parseArray(
                                            career.roadmap
                                        ),

                                    resources:
                                        parseArray(
                                            career.resources
                                        ),

                                    requiredSkills:
                                        requiredSkills

                                };

                            });


                        // Highest match first

                        results.sort(
                            (a, b) =>
                                b.score - a.score
                        );


                        res.json({

                            success: true,

                            profile: {

                                qualification:
                                    profile.qualification,

                                field:
                                    profile.field,

                                interest:
                                    profile.interest,

                                skills:
                                    userSkills

                            },

                            invalidSkills:
                                invalidSkills,

                            recommendations:
                                results

                        });

                    }
                );

            }
        );

    }
);


// ============================================================
// SERVER START
// ============================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log("======================================");
        console.log(" Career Guidance Portal Server");
        console.log("======================================");

        console.log(
            `Server running at http://localhost:${PORT}`
        );

        console.log("");

    }
);