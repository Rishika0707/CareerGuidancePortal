const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();

const PORT = 3000;
const HOST = "127.0.0.1";

// =====================================================
// SERVER SETUP
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve project files
app.use(express.static(__dirname));

// =====================================================
// DATABASE
// =====================================================

const dbPath = path.join(__dirname, "career_guidance.db");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

// =====================================================
// CREATE TABLES
// =====================================================

db.serialize(() => {

    // USERS
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `, (err) => {

        if (err) {
            console.error("Users table error:", err.message);
        } else {
            console.log("Users table ready.");
        }
    });


    // PROFILES
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
    `, (err) => {

        if (err) {
            console.error("Profiles table error:", err.message);
        } else {
            console.log("Profiles table ready.");
        }
    });


    // CAREERS
    db.run(`
        CREATE TABLE IF NOT EXISTS careers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            career_name TEXT NOT NULL,
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
    `, (err) => {

        if (err) {
            console.error("Careers table error:", err.message);
        } else {
            console.log("Careers table ready.");

            checkCareerDatabase();
        }
    });
});


// =====================================================
// CAREER DATABASE CHECK
// =====================================================

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
                    `Career database already contains ${row.count} careers.`
                );

                return;
            }

            console.log(
                "Career database is empty. Adding default career data..."
            );

            insertDefaultCareers();
        }
    );
}


// =====================================================
// DEFAULT CAREERS
// =====================================================

function insertDefaultCareers() {

    const careers = [

        {
            career_name: "Web Developer",
            minimum_qualification: "Bachelor",
            interests: [
                "Programming",
                "Technology",
                "Web Development"
            ],
            fields: [
                "Computer Science",
                "Information Technology",
                "Computer Applications",
                "Engineering",
                "Technology"
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
                "Responsive Design"
            ],
            timeline: "6–12 months",
            reason:
                "Web development is a strong option for learners interested in technology, programming and creating websites or web applications.",
            roadmap: [
                "Learn HTML and CSS.",
                "Learn JavaScript fundamentals.",
                "Build responsive websites.",
                "Learn Git and GitHub.",
                "Learn a frontend framework.",
                "Build a professional web portfolio."
            ],
            resources: [
                "HTML and CSS tutorials",
                "JavaScript courses",
                "Git and GitHub tutorials",
                "Frontend development projects",
                "Web development documentation"
            ]
        },

        {
            career_name: "Data Analyst",
            minimum_qualification: "Bachelor",
            interests: [
                "Data Analysis",
                "Analytics",
                "Technology",
                "Mathematics"
            ],
            fields: [
                "Computer Science",
                "Information Technology",
                "Mathematics",
                "Statistics",
                "Commerce",
                "Economics",
                "Business"
            ],
            skills: [
                "Data Analysis",
                "Excel",
                "Statistics",
                "SQL",
                "Python"
            ],
            required_skills: [
                "Excel",
                "SQL",
                "Statistics",
                "Python",
                "Data Visualization"
            ],
            timeline: "6–10 months",
            reason:
                "Data analysis is suitable for people who enjoy working with numbers, information, patterns and business insights.",
            roadmap: [
                "Learn Excel.",
                "Learn basic statistics.",
                "Learn SQL.",
                "Learn Python for data analysis.",
                "Practice data visualization.",
                "Build data analysis projects."
            ],
            resources: [
                "Excel tutorials",
                "SQL courses",
                "Statistics courses",
                "Python data analysis tutorials",
                "Data visualization projects"
            ]
        },

        {
            career_name: "UI/UX Designer",
            minimum_qualification: "Bachelor",
            interests: [
                "Design",
                "UI Design",
                "UX Design",
                "User Experience",
                "Creative Design"
            ],
            fields: [
                "Fine Art",
                "Design",
                "Arts",
                "Graphic Design",
                "Animation",
                "Multimedia"
            ],
            skills: [
                "Design",
                "UI Design",
                "UX Design",
                "Figma",
                "Wireframing",
                "Prototyping"
            ],
            required_skills: [
                "UI Design",
                "UX Research",
                "Figma",
                "Wireframing",
                "Prototyping",
                "User Research",
                "Design Systems"
            ],
            timeline: "4–8 months",
            reason:
                "UI/UX design combines creativity, visual design and problem-solving to create useful and user-friendly digital experiences.",
            roadmap: [
                "Learn basic design principles.",
                "Learn Figma.",
                "Practice wireframing and layouts.",
                "Learn UX research basics.",
                "Create 3–5 design projects.",
                "Build a professional UI/UX portfolio."
            ],
            resources: [
                "Figma tutorials",
                "UI design courses",
                "UX research tutorials",
                "Design practice projects",
                "Portfolio examples"
            ]
        },

        {
            career_name: "Business Analyst",
            minimum_qualification: "Bachelor",
            interests: [
                "Business",
                "Management",
                "Analysis",
                "Problem Solving"
            ],
            fields: [
                "Business",
                "Commerce",
                "Management",
                "Economics",
                "Computer Science",
                "Information Technology"
            ],
            skills: [
                "Communication",
                "Analysis",
                "Excel",
                "Problem Solving",
                "Business"
            ],
            required_skills: [
                "Business Analysis",
                "Excel",
                "Communication",
                "Problem Solving",
                "Data Analysis",
                "Documentation"
            ],
            timeline: "5–10 months",
            reason:
                "Business analysis is suitable for people who enjoy understanding business problems, analyzing information and communicating solutions.",
            roadmap: [
                "Learn business fundamentals.",
                "Improve Excel skills.",
                "Learn business analysis techniques.",
                "Practice requirements gathering.",
                "Learn data analysis basics.",
                "Build business analysis case studies."
            ],
            resources: [
                "Business analysis courses",
                "Excel tutorials",
                "Case study exercises",
                "Business documentation examples",
                "Communication courses"
            ]
        },

        {
            career_name: "Digital Marketing Specialist",
            minimum_qualification: "12th",
            interests: [
                "Marketing",
                "Communication",
                "Business",
                "Social Media",
                "Creative"
            ],
            fields: [
                "Marketing",
                "Business",
                "Commerce",
                "Management",
                "Arts",
                "Mass Communication"
            ],
            skills: [
                "Communication",
                "Marketing",
                "Social Media",
                "Content",
                "SEO"
            ],
            required_skills: [
                "Digital Marketing",
                "SEO",
                "Social Media Marketing",
                "Content Marketing",
                "Analytics",
                "Communication"
            ],
            timeline: "3–6 months",
            reason:
                "Digital marketing is suitable for people interested in communication, creativity, business promotion and online platforms.",
            roadmap: [
                "Learn digital marketing fundamentals.",
                "Learn SEO.",
                "Learn social media marketing.",
                "Practice content marketing.",
                "Learn digital analytics.",
                "Create marketing campaigns."
            ],
            resources: [
                "Digital marketing courses",
                "SEO tutorials",
                "Social media marketing guides",
                "Content marketing resources",
                "Analytics tutorials"
            ]
        },

        {
            career_name: "Content Writer",
            minimum_qualification: "12th",
            interests: [
                "Writing",
                "Content",
                "Communication",
                "Creative Writing"
            ],
            fields: [
                "Arts",
                "English",
                "Mass Communication",
                "Journalism",
                "Humanities"
            ],
            skills: [
                "Writing",
                "Communication",
                "Content Writing",
                "Research"
            ],
            required_skills: [
                "Content Writing",
                "Grammar",
                "Research",
                "SEO Writing",
                "Editing"
            ],
            timeline: "2–5 months",
            reason:
                "Content writing is a suitable option for people who enjoy writing, communication, research and creative expression.",
            roadmap: [
                "Improve grammar and writing.",
                "Learn content writing.",
                "Practice different writing formats.",
                "Learn basic SEO.",
                "Create writing samples.",
                "Build a writing portfolio."
            ],
            resources: [
                "Writing courses",
                "Grammar resources",
                "SEO writing tutorials",
                "Writing practice websites",
                "Content portfolio examples"
            ]
        },

        {
            career_name: "Graphic Designer",
            minimum_qualification: "12th",
            interests: [
                "Design",
                "Graphic Design",
                "Creative",
                "Art"
            ],
            fields: [
                "Fine Art",
                "Design",
                "Arts",
                "Graphic Design",
                "Animation",
                "Multimedia"
            ],
            skills: [
                "Design",
                "Graphic Design",
                "Photoshop",
                "Illustrator",
                "Creativity"
            ],
            required_skills: [
                "Graphic Design",
                "Photoshop",
                "Illustrator",
                "Typography",
                "Color Theory",
                "Branding"
            ],
            timeline: "3–6 months",
            reason:
                "Graphic design is suitable for people interested in visual creativity, artwork, branding and communication through images.",
            roadmap: [
                "Learn design principles.",
                "Learn Photoshop or equivalent tools.",
                "Learn Illustrator or vector design.",
                "Practice typography and color theory.",
                "Create design projects.",
                "Build a graphic design portfolio."
            ],
            resources: [
                "Graphic design courses",
                "Photoshop tutorials",
                "Illustrator tutorials",
                "Typography resources",
                "Design portfolio examples"
            ]
        },

        {
            career_name: "Office Assistant",
            minimum_qualification: "12th",
            interests: [
                "Administration",
                "Organization",
                "Office Work",
                "Communication"
            ],
            fields: [
                "Arts",
                "Commerce",
                "Business",
                "Management"
            ],
            skills: [
                "Communication",
                "Organization",
                "MS Office",
                "Typing"
            ],
            required_skills: [
                "MS Office",
                "Typing",
                "Communication",
                "Organization",
                "Documentation"
            ],
            timeline: "1–3 months",
            reason:
                "Office administration can be suitable for people who enjoy organization, communication and structured office work.",
            roadmap: [
                "Learn MS Word.",
                "Learn Excel basics.",
                "Improve typing speed.",
                "Improve communication skills.",
                "Learn office documentation.",
                "Apply for entry-level office roles."
            ],
            resources: [
                "MS Office tutorials",
                "Typing practice",
                "Communication courses",
                "Office administration courses",
                "Excel tutorials"
            ]
        },

        {
            career_name: "Retail Associate",
            minimum_qualification: "10th",
            interests: [
                "Customer Service",
                "Sales",
                "Communication",
                "Retail"
            ],
            fields: [
                "Any Field",
                "Arts",
                "Commerce",
                "Business"
            ],
            skills: [
                "Communication",
                "Customer Service",
                "Sales"
            ],
            required_skills: [
                "Customer Service",
                "Communication",
                "Sales",
                "Product Knowledge"
            ],
            timeline: "1–2 months",
            reason:
                "Retail roles can be suitable for people who enjoy interacting with customers, communication and sales.",
            roadmap: [
                "Improve communication.",
                "Learn customer service.",
                "Learn basic sales techniques.",
                "Understand product knowledge.",
                "Practice customer interaction.",
                "Apply for retail positions."
            ],
            resources: [
                "Customer service courses",
                "Sales training",
                "Communication practice",
                "Retail training resources"
            ]
        },

        {
            career_name: "Sales Associate",
            minimum_qualification: "12th",
            interests: [
                "Sales",
                "Business",
                "Communication",
                "Marketing"
            ],
            fields: [
                "Business",
                "Commerce",
                "Management",
                "Arts"
            ],
            skills: [
                "Communication",
                "Sales",
                "Negotiation",
                "Customer Service"
            ],
            required_skills: [
                "Sales",
                "Communication",
                "Negotiation",
                "Customer Service",
                "Product Knowledge"
            ],
            timeline: "1–4 months",
            reason:
                "Sales can be suitable for people who enjoy communication, business interactions and working with customers.",
            roadmap: [
                "Improve communication.",
                "Learn sales fundamentals.",
                "Practice negotiation.",
                "Learn customer relationship skills.",
                "Understand sales processes.",
                "Apply for entry-level sales positions."
            ],
            resources: [
                "Sales courses",
                "Negotiation tutorials",
                "Communication training",
                "Customer relationship resources"
            ]
        },

        {
            career_name: "Data Entry Operator",
            minimum_qualification: "12th",
            interests: [
                "Computer Work",
                "Office Work",
                "Data",
                "Organization"
            ],
            fields: [
                "Any Field",
                "Arts",
                "Commerce",
                "Business"
            ],
            skills: [
                "Typing",
                "MS Office",
                "Data Entry",
                "Computer"
            ],
            required_skills: [
                "Typing",
                "MS Excel",
                "Data Entry",
                "Computer Skills",
                "Accuracy"
            ],
            timeline: "1–2 months",
            reason:
                "Data entry can be suitable for people who prefer structured computer-based work involving accuracy and organization.",
            roadmap: [
                "Improve typing speed.",
                "Learn MS Excel.",
                "Learn data entry techniques.",
                "Improve accuracy.",
                "Practice spreadsheet work.",
                "Apply for entry-level data roles."
            ],
            resources: [
                "Typing practice",
                "Excel tutorials",
                "Data entry courses",
                "Spreadsheet exercises"
            ]
        }

    ];


    const sql = `
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
    `;


    careers.forEach(career => {

        db.run(
            sql,
            [
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
            ],
            (err) => {

                if (err) {
                    console.error(
                        `Error inserting ${career.career_name}:`,
                        err.message
                    );
                }
            }
        );
    });

    console.log("Career database populated.");
}


// =====================================================
// UNIVERSAL ARRAY PARSER
// =====================================================

function parseArray(value) {

    if (value === null || value === undefined) {
        return [];
    }


    // Already an array
    if (Array.isArray(value)) {

        return value
            .map(item => String(item).trim())
            .filter(Boolean);
    }


    const text = String(value).trim();

    if (!text) {
        return [];
    }


    // Try JSON first
    try {

        const parsed = JSON.parse(text);

        if (Array.isArray(parsed)) {

            return parsed
                .map(item => String(item).trim())
                .filter(Boolean);
        }

        // JSON string
        if (typeof parsed === "string") {
            return [parsed.trim()];
        }

    } catch (error) {
        // Not JSON. Continue.
    }


    // Comma-separated fallback
    return text
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
}


// =====================================================
// NORMALIZE TEXT
// =====================================================

function normalizeText(value) {

    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}


// =====================================================
// TEXT SIMILARITY
// =====================================================

function textMatches(value1, value2) {

    const first = normalizeText(value1);
    const second = normalizeText(value2);

    if (!first || !second) {
        return false;
    }


    // Exact
    if (first === second) {
        return true;
    }


    // Contains
    if (
        first.includes(second) ||
        second.includes(first)
    ) {
        return true;
    }


    // Word overlap
    const firstWords = first.split(" ");
    const secondWords = second.split(" ");

    const overlap = firstWords.some(word =>
        word.length >= 4 &&
        secondWords.includes(word)
    );

    return overlap;
}


// =====================================================
// QUALIFICATION RANK
// =====================================================

function qualificationRank(value) {

    const qualification = normalizeText(value);

    const ranks = {
        "10th": 1,
        "10": 1,

        "12th": 2,
        "12": 2,

        "diploma": 3,

        "bachelor": 4,
        "graduation": 4,
        "graduate": 4,

        "master": 5,
        "post graduation": 5,
        "postgraduate": 5
    };

    return ranks[qualification] || 0;
}


// =====================================================
// QUALIFICATION MATCH
// =====================================================

function calculateQualificationMatch(
    userQualification,
    minimumQualification
) {

    const userRank =
        qualificationRank(userQualification);

    const requiredRank =
        qualificationRank(minimumQualification);


    if (!userRank || !requiredRank) {

        return {
            score: 0,
            meetsRequirement: false,
            label: "Qualification should be verified"
        };
    }


    // Meets or exceeds
    if (userRank >= requiredRank) {

        return {
            score: 10,
            meetsRequirement: true,
            label: "Qualification requirement met"
        };
    }


    const difference =
        requiredRank - userRank;


    // One educational step below
    if (difference === 1) {

        return {
            score: 6,
            meetsRequirement: false,
            label:
                "Additional education is recommended before entering this career"
        };
    }


    // Two or more levels below
    return {
        score: 3,
        meetsRequirement: false,
        label:
            "Higher qualification is recommended for this career"
    };
}


// =====================================================
// USER SKILL NORMALIZATION
// =====================================================

function normalizeProfileSkills(skills) {

    if (!skills) {
        return [];
    }


    // JSON stored as string
    if (typeof skills === "string") {

        try {

            const parsed = JSON.parse(skills);

            if (Array.isArray(parsed)) {
                skills = parsed;
            }

        } catch (error) {

            // Old comma-separated format

            skills = skills
                .split(",")
                .map(item => ({
                    name: item.trim(),
                    level: "Beginner"
                }));
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
                name: String(skill.name || "").trim(),
                level: skill.level || "Beginner"
            };
        })
        .filter(skill => skill.name);
}


// =====================================================
// SKILL LEVEL
// =====================================================

function skillLevelMultiplier(level) {

    const normalized =
        normalizeText(level);


    if (normalized === "advanced") {
        return 1;
    }


    if (normalized === "intermediate") {
        return 0.75;
    }


    return 0.5;
}


// =====================================================
// SKILL MATCHING
// =====================================================

function calculateSkillMatch(
    profileSkills,
    careerSkills,
    requiredSkills
) {

    const matchedSkills = [];

    const skillGaps = [];

    let rawScore = 0;


    // -------------------------------------------------
    // Match user's skills against career skills
    // -------------------------------------------------

    profileSkills.forEach(profileSkill => {

        const userSkill =
            normalizeText(profileSkill.name);


        if (!userSkill) {
            return;
        }


        const matchingCareerSkill =
            careerSkills.find(careerSkill =>
                textMatches(
                    userSkill,
                    careerSkill
                )
            );


        if (matchingCareerSkill) {

            const multiplier =
                skillLevelMultiplier(
                    profileSkill.level
                );


            matchedSkills.push({

                skill: profileSkill.name,

                level: profileSkill.level,

                matchedWith:
                    matchingCareerSkill
            });


            // Each matched skill contributes
            // up to 10 points.

            rawScore +=
                10 * multiplier;
        }
    });


    // -------------------------------------------------
    // Identify missing required skills
    // -------------------------------------------------

    requiredSkills.forEach(requiredSkill => {

        const hasSkill =
            profileSkills.some(profileSkill =>
                textMatches(
                    profileSkill.name,
                    requiredSkill
                )
            );


        if (!hasSkill) {

            skillGaps.push(
                requiredSkill
            );
        }
    });


    // Maximum = 30 points
    const score =
        Math.min(
            Math.round(rawScore),
            30
        );


    return {

        score,

        matchedSkills,

        skillGaps
    };
}


// =====================================================
// INTEREST MATCHING
// =====================================================

function calculateInterestMatch(
    userInterest,
    careerInterests
) {

    const interest =
        normalizeText(userInterest);


    if (!interest || careerInterests.length === 0) {

        return {
            score: 0,
            type: "none"
        };
    }


    // Exact match = 40

    const exactMatchFound =
        careerInterests.some(item =>
            normalizeText(item) === interest
        );


    if (exactMatchFound) {

        return {
            score: 40,
            type: "strong"
        };
    }


    // Related match = 30

    const relatedMatch =
        careerInterests.some(item =>
            textMatches(
                interest,
                item
            )
        );


    if (relatedMatch) {

        return {
            score: 30,
            type: "related"
        };
    }


    return {
        score: 0,
        type: "none"
    };
}


// =====================================================
// FIELD MATCHING
// =====================================================

function calculateFieldMatch(
    userField,
    careerFields
) {

    const field =
        normalizeText(userField);


    if (!field || careerFields.length === 0) {

        return {
            score: 0,
            type: "none"
        };
    }


    // "Any Field" should provide
    // a basic field compatibility.

    const anyField =
        careerFields.some(item =>
            normalizeText(item) === "any field"
        );


    if (anyField) {

        return {
            score: 15,
            type: "general"
        };
    }


    // Exact
    const exact =
        careerFields.some(item =>
            normalizeText(item) === field
        );


    if (exact) {

        return {
            score: 20,
            type: "strong"
        };
    }


    // Related
    const related =
        careerFields.some(item =>
            textMatches(
                field,
                item
            )
        );


    if (related) {

        return {
            score: 12,
            type: "related"
        };
    }


    return {
        score: 0,
        type: "none"
    };
}


// =====================================================
// MAIN CAREER SCORING ENGINE
// =====================================================

function calculateCareerScore(
    profile,
    career
) {

    const careerInterests =
        parseArray(career.interests);

    const careerFields =
        parseArray(career.fields);

    const careerSkills =
        parseArray(career.skills);

    const requiredSkills =
        parseArray(career.required_skills);


    // -------------------------------------------------
    // INTEREST
    // -------------------------------------------------

    const interestMatch =
        calculateInterestMatch(
            profile.interest,
            careerInterests
        );


    // -------------------------------------------------
    // SKILLS
    // -------------------------------------------------

    const skillMatch =
        calculateSkillMatch(
            profile.skills,
            careerSkills,
            requiredSkills
        );


    // -------------------------------------------------
    // FIELD
    // -------------------------------------------------

    const fieldMatch =
        calculateFieldMatch(
            profile.field,
            careerFields
        );


    // -------------------------------------------------
    // QUALIFICATION
    // -------------------------------------------------

    const qualificationMatch =
        calculateQualificationMatch(
            profile.qualification,
            career.minimum_qualification
        );


    // -------------------------------------------------
    // TOTAL SCORE
    // -------------------------------------------------

    let score =
        interestMatch.score +
        skillMatch.score +
        fieldMatch.score +
        qualificationMatch.score;


    score =
        Math.max(
            0,
            Math.min(
                Math.round(score),
                100
            )
        );


    // =================================================
    // IMPROVED EXPLANATION
    // =================================================

    const reasons = [];


    // -------------------------------------------------
    // Interest explanation
    // -------------------------------------------------

    if (interestMatch.type === "strong") {

        reasons.push(
            `Your interest in ${profile.interest} strongly matches this career`
        );

    } else if (interestMatch.type === "related") {

        reasons.push(
            `Your interest in ${profile.interest} is related to this career`
        );
    }


    // -------------------------------------------------
    // Academic field explanation
    // -------------------------------------------------

    if (fieldMatch.type === "strong") {

        reasons.push(
            `Your ${profile.field} academic background is directly relevant`
        );

    } else if (fieldMatch.type === "related") {

        reasons.push(
            `Your ${profile.field} academic background has some relevance`
        );

    } else if (fieldMatch.type === "general") {

        reasons.push(
            "This career accepts candidates from different academic fields"
        );
    }


    // -------------------------------------------------
    // Skills explanation
    // -------------------------------------------------

    if (skillMatch.matchedSkills.length > 0) {

        const count =
            skillMatch.matchedSkills.length;

        reasons.push(
            `${count} of your current skill${count > 1 ? "s" : ""} match${count === 1 ? "es" : ""} this career`
        );

    } else {

        reasons.push(
            "You do not have any matching skills listed yet"
        );
    }


    // -------------------------------------------------
    // Qualification explanation
    // -------------------------------------------------

    if (qualificationMatch.meetsRequirement) {

        reasons.push(
            `Your ${profile.qualification} qualification meets the minimum requirement`
        );

    } else {

        reasons.push(
            `${qualificationMatch.label}. The minimum recommended qualification is ${career.minimum_qualification}`
        );
    }


    // -------------------------------------------------
    // Final explanation
    // -------------------------------------------------

    const explanation =
        reasons.join(". ") + ".";


    // =================================================
    // CONFIDENCE
    // =================================================

    let confidence = "Low";


    if (score >= 75) {

        confidence = "High";

    } else if (score >= 50) {

        confidence = "Medium";
    }


    // =================================================
    // RECOMMENDATION TYPE
    // =================================================

    let recommendationType =
        "Explore";


    if (score >= 75) {

        recommendationType =
            "Strong Match";

    } else if (score >= 55) {

        recommendationType =
            "Good Match";

    } else if (score >= 35) {

        recommendationType =
            "Potential Match";
    }


    return {

        score,

        confidence,

        recommendationType,

        explanation,

        scoreBreakdown: {

            interest:
                interestMatch.score,

            skills:
                skillMatch.score,

            field:
                fieldMatch.score,

            qualification:
                qualificationMatch.score
        },

        matchedSkills:
            skillMatch.matchedSkills,

        skillGaps:
            skillMatch.skillGaps,

        qualificationStatus: {

            meetsRequirement:
                qualificationMatch.meetsRequirement,

            label:
                qualificationMatch.label,

            minimumRequired:
                career.minimum_qualification,

            userQualification:
                profile.qualification
        }
    };
}


// =====================================================
// REGISTER
// =====================================================
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
            message: "All fields are required."
        });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

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
            cleanName,
            cleanEmail,
            password
        ],
        function(err) {

            if (err) {

                if (
                    err.message.includes("UNIQUE")
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "An account with this email already exists."
                    });
                }

                console.error(
                    "Registration error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Registration failed."
                });
            }

            return res.json({
                success: true,
                message: "Registration successful!",
                userId: this.lastID
            });
        }
    );
});


// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", (req, res) => {

    const {
        email,
        password
    } = req.body;


    if (
        !email ||
        !password
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Email and password are required."
        });
    }


    const cleanEmail =
        email.trim().toLowerCase();


    db.get(
        `
        SELECT
            id,
            full_name,
            email
        FROM users
        WHERE email = ?
        AND password = ?
        `,
        [
            cleanEmail,
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


            return res.json({

                success: true,

                message:
                    "Login successful!",

                userId:
                    user.id,

                fullName:
                    user.full_name,

                email:
                    user.email
            });
        }
    );
});


// =====================================================
// SAVE / UPDATE PROFILE
// =====================================================

app.post("/api/profile", (req, res) => {

    const {
        user_id,
        qualification,
        field,
        interest,
        skills
    } = req.body;


    if (!user_id) {

        return res.status(400).json({

            success: false,

            message:
                "User ID is required."
        });
    }


    const normalizedSkills =
        normalizeProfileSkills(skills);


    const skillsJSON =
        JSON.stringify(
            normalizedSkills
        );


    db.get(
        `
        SELECT id
        FROM profiles
        WHERE user_id = ?
        `,
        [user_id],
        (err, existingProfile) => {

            if (err) {

                console.error(
                    "Profile lookup error:",
                    err.message
                );


                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to save profile."
                });
            }


            // UPDATE

            if (existingProfile) {

                db.run(
                    `
                    UPDATE profiles
                    SET
                        qualification = ?,
                        field = ?,
                        interest = ?,
                        skills = ?
                    WHERE user_id = ?
                    `,
                    [
                        qualification,
                        field,
                        interest,
                        skillsJSON,
                        user_id
                    ],
                    function(updateErr) {

                        if (updateErr) {

                            console.error(
                                "Profile update error:",
                                updateErr.message
                            );


                            return res.status(500).json({

                                success: false,

                                message:
                                    "Unable to update profile."
                            });
                        }


                        return res.json({

                            success: true,

                            message:
                                "Profile updated successfully."
                        });
                    }
                );

            }

            // INSERT

            else {

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
                    `,
                    [
                        user_id,
                        qualification,
                        field,
                        interest,
                        skillsJSON
                    ],
                    function(insertErr) {

                        if (insertErr) {

                            console.error(
                                "Profile insert error:",
                                insertErr.message
                            );


                            return res.status(500).json({

                                success: false,

                                message:
                                    "Unable to save profile."
                            });
                        }


                        return res.json({

                            success: true,

                            message:
                                "Profile saved successfully."
                        });
                    }
                );
            }
        }
    );
});


// =====================================================
// GET PROFILE
// =====================================================

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
                        "Unable to load profile."
                });
            }


            if (!row) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."
                });
            }


            row.skills =
                normalizeProfileSkills(
                    row.skills
                );


            return res.json({

                success: true,

                profile: row
            });
        }
    );
});


// =====================================================
// GET ALL CAREERS
// =====================================================

app.get("/api/careers", (req, res) => {

    db.all(
        `
        SELECT *
        FROM careers
        ORDER BY career_name
        `,
        [],
        (err, careers) => {

            if (err) {

                console.error(
                    "Careers error:",
                    err.message
                );


                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to load careers."
                });
            }


            return res.json({

                success: true,

                careers
            });
        }
    );
});


// =====================================================
// RECOMMENDATIONS
// =====================================================

app.get(
    "/api/recommendations/:userId",
    (req, res) => {

        const userId =
            req.params.userId;


        // Load profile

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
            (err, profile) => {

                if (err) {

                    console.error(
                        "Recommendation profile error:",
                        err.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to generate recommendations."
                    });
                }


                if (!profile) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "User not found."
                    });
                }


                // Normalize profile skills

                profile.skills =
                    normalizeProfileSkills(
                        profile.skills
                    );


                // Load careers

                db.all(
                    `
                    SELECT *
                    FROM careers
                    `,
                    [],
                    (careerErr, careers) => {

                        if (careerErr) {

                            console.error(
                                "Career loading error:",
                                careerErr.message
                            );


                            return res.status(500).json({

                                success: false,

                                message:
                                    "Unable to load career data."
                            });
                        }


                        // Calculate all recommendations

                        const recommendations =
                            careers.map(career => {

                                const result =
                                    calculateCareerScore(
                                        profile,
                                        career
                                    );


                                return {

                                    id:
                                        career.id,

                                    careerName:
                                        career.career_name,

                                    score:
                                        result.score,

                                    confidence:
                                        result.confidence,

                                    recommendationType:
                                        result.recommendationType,

                                    explanation:
                                        result.explanation,

                                    scoreBreakdown:
                                        result.scoreBreakdown,

                                    matchedSkills:
                                        result.matchedSkills,

                                    skillGaps:
                                        result.skillGaps,

                                    qualificationStatus:
                                        result.qualificationStatus,

                                    minimumQualification:
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

                                    requiredSkills:
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
                                };
                            });


                        // Sort by highest score

                        recommendations.sort(
                            (a, b) =>
                                b.score - a.score
                        );


                        // Main recommendation

                        const recommendedCareer =
                            recommendations.length
                                ? recommendations[0]
                                : null;


                        // Profile completeness

                        const completeness = {

                            qualification:
                                Boolean(
                                    profile.qualification
                                ),

                            field:
                                Boolean(
                                    profile.field
                                ),

                            interest:
                                Boolean(
                                    profile.interest
                                ),

                            skills:
                                profile.skills.length > 0
                        };


                        const completed =
                            Object.values(
                                completeness
                            ).filter(Boolean).length;


                        const percentage =
                            Math.round(
                                (completed / 4) * 100
                            );


                        // Response

                        return res.json({

                            success: true,

                            profile: {

                                id:
                                    profile.id,

                                fullName:
                                    profile.full_name,

                                email:
                                    profile.email,

                                qualification:
                                    profile.qualification,

                                field:
                                    profile.field,

                                interest:
                                    profile.interest,

                                skills:
                                    profile.skills
                            },


                            profileCompleteness: {

                                percentage,

                                details:
                                    completeness
                            },


                            recommendedCareer,

                            recommendations
                        });
                    }
                );
            }
        );
    }
);


// =====================================================
// SERVER TEST
// =====================================================

app.get("/api/test", (req, res) => {

    res.json({

        success: true,

        message:
            "Career Guidance Portal server is working!"
    });
});


// =====================================================
// HOME PAGE
// =====================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );
});


// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "Server error:",
            err
        );


        res.status(500).json({

            success: false,

            message:
                "Internal server error."
        });
    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
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
            `Server running on port ${PORT}`
        );

        console.log("");

        console.log(
            "Press Ctrl + C to stop the server."
        );

        console.log("");
    }
);