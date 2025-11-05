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
  origin: (origin, cb) => {
    // Allow extension origins and localhost in dev
    if (!origin) return cb(null, true);
    if (origin.startsWith('chrome-extension://')) return cb(null, true);
    if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return cb(null, true);
    return cb(null, false);
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false
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

function truncateWords(s, maxWords = 20) {
  if (!s) return s;
  const parts = s.split(/\s+/);
  return parts.length <= maxWords ? s : parts.slice(0, maxWords).join(' ') + '…';
}
function capBullets(arr, maxCount, maxWords) {
  if (!Array.isArray(arr)) return arr;
  return arr.slice(0, maxCount).map(b => truncateWords(b, maxWords));
}
function approxCharCount(obj) {
  try { return JSON.stringify(obj).length; } catch { return 0; }
}
function trimResumeForOnePage(resume) {
  // Cap bullets per experience/project and bullet length
  if (Array.isArray(resume.experience)) {
    resume.experience = resume.experience.map(r => ({
      ...r,
      bullets: capBullets(r.bullets, 4, 22) // 3–4 bullets, ~22 words
    })).slice(0, 4); // cap number of roles (optional)
  }
  if (Array.isArray(resume.projects)) {
    resume.projects = resume.projects.map(p => ({
      ...p,
      bullets: capBullets(p.bullets, 3, 20) // 2–3 bullets, ~20 words
    })).slice(0, 3);
  }
  if (Array.isArray(resume.skills)) resume.skills = resume.skills.slice(0, 4); // 3–4 lines
  // Light global size guard (roughly keeps JSON small ~ one page when rendered)
  let size = approxCharCount(resume);
  const limit = 8000; // tune as needed for your renderer
  if (size > limit && Array.isArray(resume.experience)) {
    resume.experience = resume.experience.slice(0, 3);
    size = approxCharCount(resume);
  }
  return resume;
}



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
    
const systemPrompt = `You are a resume writer who creates truthful, concise, ATS-friendly
one-page resumes. Do NOT fabricate experiences, programs, or certifications.
Only use or lightly rephrase what is provided in the profile or job text.
Prefer measurable impact, clear verbs, and job-relevant keywords. Keep the
final result to a single U.S. Letter page when rendered with a typical resume
template (≈ 600–750 words total).`;

const userPrompt = `Create a targeted, one-page resume for the ${roleName} role at ${companyName}.
Strict rules:
• Do NOT invent or hallucinate content (programs, certs, jobs). If data is missing, omit the section.
• Keep to a single page worth of content (≈ 600–750 words max).
• Section order for new grads: Header → Skills → Education → Experience → Projects → (optional) Programs/Certifications.
• Bullet counts (upper bounds): Experience 3–4 bullets per role; Projects 2–3 bullets per project.
• Bullet length: ~12–22 words; be specific and outcome-oriented.
• Skills: 3–4 category lines max (Languages, Frameworks/Libs, Data/Databases, Cloud/DevOps/Tools).
• Education: keep accurate (degree, school, location, dates, GPA if provided); include 3–6 relevant courses if available.
• Programs/Certifications: include ONLY if provided in profile; otherwise OMIT this section entirely.

Prioritize: “mustInclude” experiences/projects → role relevance → recency → quantified impact.

JOB POSTING:
${jobText}

CANDIDATE PROFILE:
Name: ${profile.name}
Location: ${profile.location || 'Not specified'}
Education: ${profile.education?.degreeType || ''} ${profile.education?.major || ''}, ${profile.education?.university || 'Not specified'}${profile.education?.start && profile.education?.end ? ` (${profile.education.start} - ${profile.education.end})` : ''}${profile.education?.gpa ? `, GPA: ${profile.education.gpa}` : ''}

Skills: ${profile.skills ? profile.skills.join(', ') : 'None listed'}

Must-Include Experiences: ${mustIncludeExperiences.map(e => `${e.title} at ${e.company}`).join('; ') || 'None'}
Experiences:
${profile.experiences ? profile.experiences.map(exp => {
  let s = `${exp.title} at ${exp.company} (${exp.start} - ${exp.end}, ${exp.location})`;
  if (exp.description) s += `\nRole: ${exp.description}`;
  if (exp.bullets?.length) s += `\nKey Achievements: ${exp.bullets.join('; ')}`;
  return s;
}).join('\n\n') : 'None listed'}

Must-Include Projects: ${mustIncludeProjects.map(p => p.name).join('; ') || 'None'}
Projects:
${profile.projects ? profile.projects.map(proj => {
  let s = proj.name;
  if (proj.description) s += `\nDescription: ${proj.description}`;
  if (proj.bullets?.length) s += `\nKey Details: ${proj.bullets.join('; ')}`;
  return s;
}).join('\n\n') : 'None listed'}

Programs/Certifications (if any):
${Array.isArray(profile.programs) && profile.programs.length ? profile.programs.join('\n') : 'None'}

OUTPUT JSON (omit a section key if you have no content for it):
{
  "summary": "short headline/tagline (one line)",
  "skills": ["up to 4 categorized lines"],
  "education": {
    "degree": "...",
    "school": "...",
    "location": "...",
    "dates": "...",
    "gpa": "..."
  },
  "experience": [
    { "title": "...", "company": "...", "dates": "...", "location": "...", "bullets": ["...","...","..."] }
  ],
  "projects": [
    { "name": "...", "link": "optional", "bullets": ["...","..."] }
  ],
  "programs": ["only include if actually provided in profile"]
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
      // Drop Programs if user didn't provide any; never fabricate
      const userProvidedPrograms = Array.isArray(profile.programs) && profile.programs.length > 0;
      if (!userProvidedPrograms && 'programs' in parsedResponse) {
        delete parsedResponse.programs;
      }

      // Enforce one-page heuristics (caps bullets/counts/length)
      parsedResponse = trimResumeForOnePage(parsedResponse);

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


// === Resume PDF snapshot endpoint (unified render) ===
const puppeteer = require("puppeteer");

app.post("/pdf/fromHtml", async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: "Missing HTML content" });

  try {
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });

    await browser.close();

    // --- Server-side diagnostics (helps us confirm what we’re sending)
    const headAscii = pdf.slice(0, 8).toString("ascii");
    const headHex = pdf.slice(0, 16).toString("hex").replace(/(..)/g, "$1 ").trim();
    console.log("[fromHtml] PDF head(ascii) =", JSON.stringify(headAscii)); // should start with "%PDF-"
    console.log("[fromHtml] PDF head(hex)   =", headHex);
    console.log("[fromHtml] PDF length      =", pdf.length);

    // --- Ground-truth copy to disk (temporary debug)
    try { require("fs").writeFileSync("./_debug_server_resume.pdf", pdf); } catch {}

    // --- Send raw bytes without charset (use end(), not send())
    const headers = {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Resume.pdf"',
      "Content-Length": pdf.length
    };
    res.writeHead(200, headers);
    res.end(pdf);
  } catch (err) {
    console.error("PDF generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to render PDF", details: err.message });
    }
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
