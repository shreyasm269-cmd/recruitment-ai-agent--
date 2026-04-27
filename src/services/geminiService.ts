import { GoogleGenAI } from "@google/genai";
import { Job, ScreeningResult, Candidate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function screenResume(resumeText: string, job: Job): Promise<ScreeningResult> {
  const prompt = `
    You are an expert Indian Tech Recruiter. Analyze the following resume text against the job description.
    
    Job Description:
    - Title: ${job.title}
    - Skills Required: ${job.skills.join(", ")}
    - Experience: ${job.minExp}-${job.maxExp} years
    - Detailed Description: ${job.description}

    Resume Content:
    ${resumeText}

    Provide a JSON response with the following structure:
    {
      "matchScore": number (0-100),
      "strengths": string[],
      "weaknesses": string[],
      "missingSkills": string[],
      "verdict": "Excellent" | "Good" | "Average" | "Poor",
      "summary": "A 2-sentence professional summary for the recruiter",
      "successProbability": number (0-100, predicted success in this role),
      "culturalFitScore": number (0-100),
      "retentionRisk": "Low" | "Medium" | "High"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        systemInstruction: "You are an expert recruiting analyzer. Always return valid JSON."
      }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Screening Error:", error);
    throw new Error("Failed to analyze resume with AI.");
  }
}

export async function generateInterviewQuestions(candidateData: any, job: Job): Promise<string[]> {
  const prompt = `
    Generate 3 highly specific technical interview questions for a candidate applying for the ${job.title} role.
    Candidate strengths/skills: ${candidateData.skills?.join(", ")}
    
    Response format: Return ONLY a JSON array of 3 strings. No markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const text = response.text || "[]";
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (error) {
    return ["Describe your experience with React and Node.js.", "How do you handle state management?", "Explain a complex bug you solved."];
  }
}

export async function askRecruitmentAssistant(query: string, context: { jobs: Job[], candidates: Candidate[] }): Promise<string> {
  const prompt = `
    You are 'HireBot', an expert recruitment AI assistant. 
    CONTEXT:
    Jobs: ${JSON.stringify(context.jobs.map(j => ({title: j.title, skills: j.skills})))}
    Candidates: ${JSON.stringify(context.candidates.map(c => ({name: c.name, match: c.matchScore, status: c.status})))}
    
    User Query: ${query}
    
    Answer concisely. You can suggest candidates for specific roles or summarize the health of the pipeline.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text || "I'm sorry, I couldn't process that query.";
  } catch (error) {
    console.error("Assistant Error:", error);
    return "Error connecting to AI assistant.";
  }
}

export async function generateJobDescription(title: string, department: string): Promise<string> {
  const prompt = `
    Generate a high-impact, professional Job Description for a ${title} in the ${department} department for a growing Indian tech startup.
    Include:
    1. Summary
    2. Key Responsibilities
    3. Required Skills
    4. Why Join Us (Culture)
    Use professional but engaging language.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text || "Failed to generate job description.";
  } catch (error) {
    console.error("JD Gen Error:", error);
    return "Error generating job description. Please try again.";
  }
}

export async function sourceCandidates(jobTitle: string, jobSkills: string[]): Promise<Partial<Candidate>[]> {
  const prompt = `
    You are an AI Sourcing Agent. Proactively source 3 diverse, high-quality "mock" candidates from LinkedIn and GitHub for the following role:
    
    Role: ${jobTitle}
    Required Skills: ${jobSkills.join(", ")}
    
    For each candidate, provide:
    - Name
    - Professional headline (e.g., "Full Stack Engineer at Google")
    - Email (mock but realistic)
    - Total Experience (years)
    - Top 3 Skills
    - LinkedIn URL (mock)
    - GitHub URL (mock)
    - A brief "Why match" snippet
    
    Return ONLY a JSON array of objects with the following keys:
    [
      {
        "name": string,
        "headline": string,
        "email": string,
        "totalExp": number,
        "skills": string[],
        "linkedin": string,
        "github": string,
        "aiFeedback": string
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        systemInstruction: "You are an AI Sourcer. Always return a perfectly formatted JSON array of mock candidate objects."
      }
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Sourcing Error:", error);
    return [];
  }
}
