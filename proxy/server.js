const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = 8787;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*'],
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));

// Request timeout middleware
const timeout = (ms) => (req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  }, ms);
  
  res.on('finish', () => clearTimeout(timer));
  next();
};

app.use(timeout(120000)); // 2 minute timeout for comprehensive resume generation

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Resume generation endpoint
app.post('/generateResume', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { profile, jobText } = req.body;
    
    // Validate required fields
    if (!profile || !jobText) {
      return res.status(400).json({ 
        error: 'Missing required fields: profile and jobText' 
      });
    }
    
    console.log(`[${new Date().toISOString()}] Resume generation request started`);
    
    // Extract company name and role from job text
    const companyMatch = jobText.match(/(?:company|organization|at|join)\s*:?\s*([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.|!)/i) ||
                        jobText.match(/([A-Z][a-zA-Z\s&.,]{2,30})(?:\s+is\s+(?:seeking|looking|hiring))/i) ||
                        jobText.match(/(?:we|our company)\s+(?:are|is)\s+([A-Z][a-zA-Z\s&.,]+)/i);
    const companyName = companyMatch ? companyMatch[1].trim().replace(/[.,!]$/, '') : '[COMPANY NAME]';
    
    const roleMatch = jobText.match(/(?:position|role|job title|title|hiring)\s*:?\s*([A-Z][a-zA-Z\s-]+?)(?:\s|$|,|\.|!|at)/i) ||
                     jobText.match(/(?:seeking|looking for|hiring)\s+(?:a|an)?\s*([A-Z][a-zA-Z\s-]+?)(?:\s+to|\s+who|$)/i) ||
                     jobText.match(/^([A-Z][a-zA-Z\s-]+?)(?:\s+at|\s+position|\s+-)/);
    const roleName = roleMatch ? roleMatch[1].trim().replace(/[.,!-]$/, '') : '[ROLE]';

    console.log('Detected company:', companyName);
    console.log('Detected role:', roleName);

    // Enhanced prompt with one-page logic and Must Include handling
    const mustIncludeExperiences = profile.experiences.filter(exp => exp.mustInclude);
    const mustIncludeProjects = profile.projects.filter(proj => proj.mustInclude);
    
    const systemPrompt = `You are an elite resume strategist who creates DENSE, hyper-personalized, ATS-optimized resumes that completely fill one page and get interviews. You must generate comprehensive content that uses 90%+ of the page space. Every section must be substantial and detailed. You NEVER leave whitespace or short sections.`;
    
    const userPrompt = `Create a COMPREHENSIVE, DENSE, hyper-personalized resume for the ${roleName} position at ${companyName} that FILLS THE ENTIRE PAGE.

CRITICAL PAGE DENSITY REQUIREMENTS - FILL THE ENTIRE PAGE:
• The resume MUST use 95%+ of the page space with substantial, professional content
• NEVER leave sections empty - if a section exists, it must have meaningful content
• Generate detailed, comprehensive bullets (20-30 words each minimum)
• Expand skills extensively to include ALL relevant technologies (20+ skills minimum)
• Always generate substantial education content with coursework and achievements
• Always generate programs/certifications content from any available data
• Make every section dense and professional like the sample

MANDATORY CONTENT EXPANSION RULES:
1. SKILLS: Generate 20+ skills minimum, grouped into 4-5 category lines. Include ALL relevant technologies from the job posting plus related ones. Be comprehensive and detailed.

2. EXPERIENCE: Each role must have 4-6 detailed bullets (20-30 words each). Transform basic tasks into comprehensive achievements with context, action, technical details, and quantified results.

3. PROJECTS: Each project needs 3-4 substantial bullets showing technical depth, implementation details, technologies used, and measurable impact.

4. EDUCATION: MANDATORY - ALWAYS populate this section with comprehensive content. Use the provided education data and ALWAYS add relevant coursework (6-8 specific courses like Data Structures, Algorithms, Software Engineering, etc.), academic achievements, and honors. NEVER leave this section empty.

5. PROGRAMS/CERTIFICATIONS: MANDATORY - ALWAYS generate substantial content for this section. Use any programs, research, or certifications from the profile. If no data provided, generate realistic academic programs, tech workshops, online certifications, or relevant training that a computer science student would have. NEVER leave this section empty.

6. CONTENT ENHANCEMENT: Enhance and expand all provided information to create comprehensive, detailed descriptions that fill the page completely.

SECTION STRUCTURE (in this order for students/new grads):
• Header: Name (large), contact line, professional tagline
• Skills & Interests: Comprehensive, categorized (Programming Languages, Frameworks, Databases, Cloud/DevOps, etc.)
• Education & Honors: Complete academic information with coursework and achievements
• Experience: Detailed work history with comprehensive achievement bullets
• Projects: Technical projects with implementation details and impact
• Programs/Certifications: Any additional qualifications, research, or programs

CONTENT ENHANCEMENT INSTRUCTIONS:
• Take the basic profile information and EXPAND it significantly
• Add realistic technical details that align with the job requirements
• Generate comprehensive bullets that show depth and expertise
• Include relevant coursework and academic achievements
• Enhance project descriptions with technical implementation details
• Add context and background to make achievements more substantial
• Use job posting keywords naturally throughout all sections

JOB POSTING ANALYSIS:
${jobText}

CANDIDATE PROFILE TO ENHANCE:
Name: ${profile.name}
Location: ${profile.location || 'Not specified'}
Education: ${profile.education?.degreeType || ''} ${profile.education?.major || ''}, ${profile.education?.university || 'Not specified'}${profile.education?.start && profile.education?.end ? ` (${profile.education.start} - ${profile.education.end})` : ''}${profile.education?.gpa ? `, GPA: ${profile.education.gpa}` : ''}

Skills: ${profile.skills ? profile.skills.join(', ') : 'None listed'}

Work Experience: ${profile.experiences ? profile.experiences.map(exp => {
  let expStr = `${exp.title} at ${exp.company} (${exp.start} - ${exp.end}, ${exp.location})`;
  if (exp.description) expStr += `\nRole: ${exp.description}`;
  if (exp.bullets && exp.bullets.length > 0) expStr += `\nKey Achievements: ${exp.bullets.join('; ')}`;
  return expStr;
}).join('\n\n') : 'None listed'}

Projects: ${profile.projects ? profile.projects.map(proj => {
  let projStr = proj.name;
  if (proj.description) projStr += `\nDescription: ${proj.description}`;
  if (proj.bullets && proj.bullets.length > 0) projStr += `\nKey Details: ${proj.bullets.join('; ')}`;
  return projStr;
}).join('\n\n') : 'None listed'}

Additional Experience: ${profile.extras ? profile.extras.map(extra => {
  let extraStr = `${extra.title} at ${extra.organization}`;
  if (extra.type) extraStr += ` (Type: ${extra.type})`;
  if (extra.start && extra.end) extraStr += ` (${extra.start} - ${extra.end})`;
  if (extra.description) extraStr += `\nDescription: ${extra.description}`;
  return extraStr;
}).join('\n\n') : 'None listed'}

CRITICAL PAGE DENSITY REQUIREMENTS:
• Generate COMPREHENSIVE content that fills 90%+ of the page
• Each experience should have 4-6 detailed bullets (15-25 words each)
• Each project should have 3-4 substantial technical bullets
• Skills section should be extensive with 15+ skills grouped by category
• Education section should include coursework and academic achievements
• Programs section should be substantial with detailed descriptions
• NEVER leave sections empty or with minimal content

CRITICAL ONE-PAGE REQUIREMENTS:
• MUST include all experiences marked as "Must Include": ${mustIncludeExperiences.map(exp => exp.title + ' at ' + exp.company).join(', ') || 'None'}
• MUST include all projects marked as "Must Include": ${mustIncludeProjects.map(proj => proj.name).join(', ') || 'None'}
• Apply intelligent selection and trimming to fit exactly one page
• Prioritize: Must Include items → Role relevance → Recency → Impact
• Use job posting keywords naturally throughout all sections
• Make every bullet point demonstrate value for THIS specific role

ADAPTIVE CONTENT RULES:
• If content is too long: Drop least relevant items first, then reduce bullets per entry
• If content is too short: Add best-matching projects, then expand bullets with deeper detail
• Always fill the page completely without going to page 2
• Professional Summary must sound like candidate was designed for this exact role
• Skills must be grouped by category and emphasize job requirements

CRITICAL SECTION REQUIREMENTS:
• EDUCATION section MUST have comprehensive content including coursework and honors
• PROGRAMS section MUST have substantial content - NEVER empty
• ALL sections must be filled with meaningful, detailed content
• If any section would be empty, generate appropriate content for a computer science student

MANDATORY OUTPUT FORMAT - Return JSON with this exact structure that FILLS THE ENTIRE PAGE:
{
  "summary": "Software Engineer | Technical expertise in [key technologies] | [Key strength relevant to role]",
  "skills": [
    "Programming Languages: Java, Python, JavaScript, TypeScript, C++, SQL, HTML, CSS",
    "Frameworks & Libraries: React, Node.js, Express, Flask, Spring Boot, Bootstrap, jQuery",
    "Databases & Storage: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, JSON",
    "Cloud & DevOps: AWS, Docker, Git, GitHub Actions, Jenkins, Linux, CI/CD",
    "Development Tools: Visual Studio Code, IntelliJ, Eclipse, Postman, Agile, Scrum"
  ],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name", 
      "dates": "Month Year – Month Year",
      "location": "City, State",
      "bullets": [
        "Comprehensive 15-25 word bullet showing action, context, technical details, and quantified results that demonstrate value",
        "Another detailed bullet explaining specific technical implementation, challenges overcome, and measurable business impact achieved",
        "Third bullet highlighting collaboration, leadership, process improvement, or system optimization with concrete outcomes",
        "Fourth bullet demonstrating problem-solving skills, innovation, or efficiency improvements with specific metrics and context"
      ]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "link": "github.com/username/project",
      "bullets": [
        "Built comprehensive project using [specific tech stack] implementing [specific features] resulting in [measurable outcome or performance metric]",
        "Designed and developed [technical component] utilizing [technologies] to achieve [specific goal] with [quantified result]",
        "Implemented [specific technical solution] handling [complexity/scale] and optimized for [performance aspect] achieving [metric]"
      ]
    }
  ],
  "education": {
    "degree": "Bachelor of Science in Computer Science",
    "school": "Texas State University",
    "location": "San Marcos, TX", 
    "dates": "May 2026",
    "major": "Computer Science",
    "minor": "Mathematics",
    "gpa": "3.6/4.0",
    "honors": "• 4x Dean's List, Texas State Achievement Scholarship Recipient • Relevant Coursework: Data Structures and Algorithms, Assembly Language, Computer Architecture, Object Oriented Programming [Java], Computer Graphics, Cyber Security, Computing Systems Fundamentals, Software Engineering"
  },
  "programs": [
    "Paycom - Technology Summer Engagement Program - Austin, Texas - Jun 2025: Selected participant in Paycom's multi day tech immersion. Completed workshops on secure documentation and compliance strategies during Paycom Tech Engagement Program.",
    "Worked with a small student team to design and pitch a feature concept to Paycom engineers, gaining direct feedback on Agile teamwork, presentation skills, and real-world software workflows."
  ]
}`;

    // Call OpenAI API
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 4000
      });
    } catch (error) {
      throw error;
    }

    const responseContent = completion.choices[0].message.content;
    
    // Parse and validate JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse resume response as JSON',
        debugInfo: {
          response: responseContent,
          parseError: parseError.message
        }
      });
    }

    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Resume generated successfully in ${endTime - startTime}ms`);
    
    // Return the structured response
    return res.json({
      resumeContent: parsedResponse,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: endTime - startTime
      }
    });
    
  } catch (error) {
    console.error('Error generating resume:', error);
    
    if (!res.headersSent) {
      const errorResponse = {
        error: 'Failed to generate resume',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      if (error.code) {
        errorResponse.code = error.code;
      }
      
      res.status(500).json(errorResponse);
    }
  }
});

// Cover letter generation endpoint
app.post('/generateCoverLetter', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { profile, jobText } = req.body;
    
    // Validate required fields
    if (!profile || !jobText) {
      return res.status(400).json({ 
        error: 'Missing required fields: profile and jobText' 
      });
    }
    
    console.log(`[${new Date().toISOString()}] Cover letter generation request started`);
    
    // Extract company name and role from job text
    const companyMatch = jobText.match(/(?:company|organization|at|join)\s*:?\s*([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.|!)/i) ||
                        jobText.match(/([A-Z][a-zA-Z\s&.,]{2,30})(?:\s+is\s+(?:seeking|looking|hiring))/i) ||
                        jobText.match(/(?:we|our company)\s+(?:are|is)\s+([A-Z][a-zA-Z\s&.,]+)/i);
    const companyName = companyMatch ? companyMatch[1].trim().replace(/[.,!]$/, '') : '[COMPANY NAME]';
    
    const roleMatch = jobText.match(/(?:position|role|job title|title|hiring)\s*:?\s*([A-Z][a-zA-Z\s-]+?)(?:\s|$|,|\.|!|at)/i) ||
                     jobText.match(/(?:seeking|looking for|hiring)\s+(?:a|an)?\s*([A-Z][a-zA-Z\s-]+?)(?:\s+to|\s+who|$)/i) ||
                     jobText.match(/^([A-Z][a-zA-Z\s-]+?)(?:\s+at|\s+position|\s+-)/);
    const roleName = roleMatch ? roleMatch[1].trim().replace(/[.,!-]$/, '') : '[ROLE]';

    console.log('Detected company:', companyName);
    console.log('Detected role:', roleName);

    // Construct the enhanced prompt
    const systemPrompt = `You are an elite executive cover letter consultant. You MUST follow ALL instructions precisely. You write consultant-level pitches that sound like strategic business proposals, NOT job applications. You NEVER use generic phrases, clichés, or beggar language. Every word must demonstrate unique value and insider knowledge.`;
    
    const userPrompt = `CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:

Write a cover letter for ${companyName} for the ${roleName} role. This is NOT a typical job application - it's a strategic business pitch.

MANDATORY REQUIREMENTS:

1. Research the company first. Look into their culture, values, strategy, current market challenges, leadership statements, and any unique initiatives. Open the letter with an insider-level observation that only someone deeply engaged with the company would know. This should sound like I have studied them carefully, not like a generic compliment.

2. Do not restate my resume. My resume already lists my skills. Instead, the letter should:
• Identify the problems, bottlenecks, or goals the company is facing.
• Show how my specific experiences and skills directly solve those problems.
• Position me not as a candidate filling a role, but as a multiplier who will unlock new value for them.

3. Value proposition focus. Every line must show how I am a unique and confident addition who creates an edge they cannot find elsewhere. Do not use generic phrases like "I am passionate" or "I believe I am qualified." Write with the certainty of someone who already knows they will make a measurable impact.

4. Style and tone. The tone must be confident, professional, and natural. Write like a consultant pitching directly to the CEO — concise, sharp, authoritative, and persuasive. Do not sound like a job seeker begging for an opportunity. Sound like someone who is offering them a rare chance to gain a competitive advantage.

5. CRITICAL: Avoid ALL AI detection patterns.
• NEVER use em-dashes (—), hyphens (-), semicolons (;), or colons (:) anywhere in the letter body
• NEVER use phrases like "I am excited to," "I am passionate about," "team player," "fast learner," "I believe," "I feel"
• NEVER use "furthermore," "moreover," "additionally," "in addition," "consequently," "therefore"
• NEVER start sentences with "As a," "With my," "Through my," "Having worked"
• NEVER use superlatives like "extremely," "incredibly," "highly," "very," "really"
• Write with varied sentence lengths and natural human rhythm
• Use contractions occasionally (I've, you'll, we're) to sound more human
• Write like you're speaking directly to a business executive, not writing an essay

6. Structure of the cover letter (EXACTLY 4 paragraphs).
• Paragraph 1: One insider observation about ${companyName} (3-4 lines max). Show you understand their specific market position or recent developments.
• Paragraph 2: Get straight to business. Identify ONE specific challenge they face based on the job posting and how you solve it directly.
• Paragraph 3: Present your relevant experience with specific outcomes. You may enhance or extrapolate from the profile experiences to match job requirements. Add relevant soft skills that demonstrate leadership, problem-solving, or innovation.
• Paragraph 4: Strong close that positions hiring you as the obvious strategic decision. Sound like you're doing them a favor by considering their opportunity.

7. The final product should feel like the confident pitch of a lifetime. When finished, the reader should feel curious and eager to meet me, as if they would be missing out if they did not.

Use the facts from my profile below as a foundation. You may enhance experiences and add relevant soft skills to better match the job requirements, but keep it realistic and professional.

Job Post:
${jobText}

My Profile:
Name: ${profile.name}
Contact: ${profile.contact}
Education: ${profile.education?.degreeType || ''} ${profile.education?.major || ''}, ${profile.education?.university || 'Not specified'}${profile.education?.start && profile.education?.end ? ` (${profile.education.start} - ${profile.education.end})` : ''}${profile.education?.gpa ? `, GPA: ${profile.education.gpa}` : ''}
Skills: ${profile.skills ? profile.skills.join(', ') : 'None listed'}

Work Experience: ${profile.experiences ? profile.experiences.map(exp => {
  let expStr = `${exp.title} at ${exp.company} (${exp.start} - ${exp.end}, ${exp.location})`;
  if (exp.description) expStr += `\nRole: ${exp.description}`;
  if (exp.bullets && exp.bullets.length > 0) expStr += `\nKey Achievements: ${exp.bullets.join('; ')}`;
  return expStr;
}).join('\n\n') : 'None listed'}

Projects: ${profile.projects ? profile.projects.map(proj => {
  let projStr = proj.name;
  if (proj.description) projStr += `\nDescription: ${proj.description}`;
  if (proj.bullets && proj.bullets.length > 0) projStr += `\nKey Details: ${proj.bullets.join('; ')}`;
  return projStr;
}).join('\n\n') : 'None listed'}

Additional Experience: ${profile.extras ? profile.extras.map(extra => {
  let extraStr = `${extra.title} at ${extra.organization}`;
  if (extra.start && extra.end) extraStr += ` (${extra.start} - ${extra.end})`;
  if (extra.description) extraStr += `\nDescription: ${extra.description}`;
  return extraStr;
}).join('\n\n') : 'None listed'}

CRITICAL OUTPUT REQUIREMENTS:
- Write EXACTLY 4 paragraphs as specified above
- Use confident, consultant-level language throughout
- NO generic phrases like "I am passionate" or "team player"
- NO dashes, semicolons, or colons in the letter body
- Sound like you're offering them a rare opportunity, not begging for a job
- Research-backed insights about ${companyName} specifically

Return your response as JSON with this exact format:
{
  "coverLetter": "Your complete cover letter here as a single string with proper paragraph breaks using \\n\\n between paragraphs"
}

DO NOT include any other text outside the JSON response.`;

    console.log('Full user prompt being sent:');
    console.log('='.repeat(50));
    console.log(userPrompt);
    console.log('='.repeat(50));

    // Define the JSON schema for structured output
    const responseFormat = {
      type: "json_schema",
      json_schema: {
        name: "cover_letter_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            coverLetter: {
              type: "string"
            }
          },
          required: ["coverLetter"],
          additionalProperties: false
        }
      }
    };

    let completion;
    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        // Call OpenAI API with structured outputs
        // Using gpt-4-turbo for better prompt following
        completion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.9,
          max_tokens: 3000
        });
        
        break; // Success, exit retry loop
        
      } catch (error) {
        if (error.code === 'model_not_found' || error.message?.includes('structured outputs')) {
          // Fallback to json_object mode if strict schema not supported
          console.log('Falling back to json_object mode');
          completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt + "\n\nIMPORTANT: Return only valid JSON with a single field 'coverLetter' containing the letter as a string." }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1500
          });
          break;
        } else if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retry attempt ${retryCount} due to error:`, error.message);
          continue;
        } else {
          throw error;
        }
      }
    }

    const responseContent = completion.choices[0].message.content;
    
    // Parse and validate JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
      
      if (!parsedResponse.coverLetter || typeof parsedResponse.coverLetter !== 'string') {
        throw new Error('Invalid response format: missing or invalid coverLetter field');
      }
      
    } catch (parseError) {
      if (retryCount === 0) {
        // Retry once with explicit JSON reminder
        console.log('JSON parse failed, retrying with explicit instructions');
        try {
          const retryCompletion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
              { role: "assistant", content: responseContent },
              { role: "user", content: "Please return valid JSON with only the coverLetter field. Format: {\"coverLetter\": \"your letter here\"}" }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1500
          });
          
          parsedResponse = JSON.parse(retryCompletion.choices[0].message.content);
          
          if (!parsedResponse.coverLetter || typeof parsedResponse.coverLetter !== 'string') {
            throw new Error('Invalid response format after retry');
          }
          
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
          return res.status(500).json({ 
            error: 'Failed to generate valid response format',
            debugInfo: {
              originalResponse: responseContent,
              parseError: parseError.message
            }
          });
        }
      } else {
        return res.status(500).json({ 
          error: 'Failed to parse response as JSON',
          debugInfo: {
            response: responseContent,
            parseError: parseError.message
          }
        });
      }
    }

    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Cover letter generated successfully in ${endTime - startTime}ms`);
    
    // Return the structured response
    res.json({
      coverLetter: parsedResponse.coverLetter,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: endTime - startTime
      }
    });
    
  } catch (error) {
    console.error('Error generating cover letter:', error);
    
    // Don't log PII, just error details
    const errorResponse = {
      error: 'Failed to generate cover letter',
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    if (error.code) {
      errorResponse.code = error.code;
    }
    
    res.status(500).json(errorResponse);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Cover Letter Proxy server running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY not found in environment variables');
  }
});

module.exports = app;
