/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Briefcase, 
  FileSearch, 
  LayoutDashboard, 
  Plus, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  TrendingUp,
  MapPin,
  IndianRupee,
  Calendar,
  ChevronRight,
  Upload,
  Sparkles,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  Target,
  LogOut,
  LogIn,
  Zap,
  Video,
  ClipboardList,
  Check,
  Mail,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Candidate, Job, CandidateStatus, ApplicationStage, ChatMessage, AutomationRule, ScreeningResult, Interview, InterviewFeedback } from './types';
import { MOCK_JOBS, MOCK_CANDIDATES, MOCK_AUTOMATIONS, MOCK_INTERVIEWS } from './constants';
import { screenResume, generateInterviewQuestions, askRecruitmentAssistant, generateJobDescription, sourceCandidates } from './services/geminiService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'candidates' | 'screening' | 'interviews' | 'analytics' | 'automation'>('dashboard');
  const [talentViewMode, setTalentViewMode] = useState<'grid' | 'pipeline'>('grid');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [candidates, setCandidates] = useState<Candidate[]>(MOCK_CANDIDATES);
  const [automations, setAutomations] = useState<AutomationRule[]>(MOCK_AUTOMATIONS);
  const [interviews, setInterviews] = useState<Interview[]>(MOCK_INTERVIEWS);
  const [feedbacks, setFeedbacks] = useState<InterviewFeedback[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [sourcedCandidates, setSourcedCandidates] = useState<any[]>([]);
  const [isSourcing, setIsSourcing] = useState(false);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    // Check session on load
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
        }
      });
  }, []);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setUser(event.data.user);
        setIsAuthenticated(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGitHubLogin = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    window.open(url, 'github_oauth', 'width=600,height=700');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setUser(null);
  };
  const [showSourcingModal, setShowSourcingModal] = useState(false);
  const [activeJobForSourcing, setActiveJobForSourcing] = useState<Job | null>(null);
  const [isScreening, setIsScreening] = useState(false);

  const toggleCandidateSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCandidateIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkMoveStage = (newStatus: CandidateStatus) => {
    setCandidates(prev => prev.map(c => 
      selectedCandidateIds.includes(c.id) ? { ...c, status: newStatus } : c
    ));
    setSelectedCandidateIds([]);
  };

  const handleBulkEmail = () => {
    alert(`Mock: Sending emails to ${selectedCandidateIds.length} candidates...`);
    setSelectedCandidateIds([]);
  };
  const [isGeneratingJD, setIsGeneratingJD] = useState(false);
  const [screeningText, setScreeningText] = useState('');
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showCreateAutomationModal, setShowCreateAutomationModal] = useState(false);
  const [showScheduleInterviewModal, setShowScheduleInterviewModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeInterviewForFeedback, setActiveInterviewForFeedback] = useState<Interview | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const [showAssistant, setShowAssistant] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [newAutomation, setNewAutomation] = useState<Partial<AutomationRule>>({
    name: '',
    trigger: 'on_applied',
    condition: '',
    action: 'move_to_stage',
    isActive: true
  });

  const [newInterview, setNewInterview] = useState<Partial<Interview>>({
    candidateId: '',
    jobId: '',
    type: 'Technical',
    date: '',
    time: '',
    interviewer: '',
    status: 'Scheduled',
    notes: ''
  });

  const [newFeedback, setNewFeedback] = useState<Partial<InterviewFeedback>>({
    rating: 3,
    technicalSkillsRating: 3,
    culturalFitRating: 3,
    communicationRating: 3,
    pros: [],
    cons: [],
    decision: 'Hire',
    summary: ''
  });

  const PRO_OPTIONS = ['Strong Communication', 'Technical Proficiency', 'Cultural Fit', 'Team Player', 'Problem Solver', 'Fast Learner', 'Leadership Potential'];
  const CON_OPTIONS = ['Technical Gaps', 'Poor Communication', 'Culture Mismatch', 'Low Enthusiasm', 'Experience Gap', 'Unclear Answers', 'Expensive'];

  const toggleFeedbackTag = (type: 'pros' | 'cons', tag: string) => {
    const current = newFeedback[type] || [];
    const updated = current.includes(tag) 
      ? current.filter(t => t !== tag) 
      : [...current, tag];
    setNewFeedback({ ...newFeedback, [type]: updated });
  };

  const handleGenerateJD = async () => {
    if (!newJob.title) return;
    setIsGeneratingJD(true);
    try {
      const jd = await generateJobDescription(newJob.title, newJob.department || 'Engineering');
      setNewJob({ ...newJob, description: jd });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingJD(false);
    }
  };

  const handleCreateAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    const rule: AutomationRule = {
      ...(newAutomation as AutomationRule),
      id: Math.random().toString(36).substr(2, 9),
    };
    setAutomations([rule, ...automations]);
    setShowCreateAutomationModal(false);
    setNewAutomation({
      name: '',
      trigger: 'on_applied',
      condition: '',
      action: 'move_to_stage',
      isActive: true
    });
  };

  const handleScheduleInterview = (e: React.FormEvent) => {
    e.preventDefault();
    const interview: Interview = {
      ...(newInterview as Interview),
      id: Math.random().toString(36).substr(2, 9),
    };
    setInterviews([interview, ...interviews]);
    setShowScheduleInterviewModal(false);
    setNewInterview({
      candidateId: '',
      jobId: '',
      type: 'Technical',
      date: '',
      time: '',
      interviewer: '',
      status: 'Scheduled',
      notes: ''
    });
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterviewForFeedback) return;
    
    const feedback: InterviewFeedback = {
      ...(newFeedback as InterviewFeedback),
      id: Math.random().toString(36).substr(2, 9),
      interviewId: activeInterviewForFeedback.id,
      interviewerId: 'recruiter-1',
      createdAt: new Date().toISOString()
    };
    
    setFeedbacks([feedback, ...feedbacks]);
    
    // Update interview status to completed
    setInterviews(interviews.map(i => 
      i.id === activeInterviewForFeedback.id ? { ...i, status: 'Completed' } : i
    ));
    
    setShowFeedbackModal(false);
    setActiveInterviewForFeedback(null);
  };

  const handleSourceCandidates = async (job: Job) => {
    setActiveJobForSourcing(job);
    setIsSourcing(true);
    setShowSourcingModal(true);
    try {
      const result = await sourceCandidates(job.title, job.skills);
      setSourcedCandidates(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSourcing(false);
    }
  };

  const handleImportCandidate = (sourced: any) => {
    const newCandidate: Candidate = {
      id: Math.random().toString(36).substr(2, 9),
      name: sourced.name,
      email: sourced.email,
      phone: '+91 99999 00000',
      currentCTC: 12,
      expectedCTC: 18,
      noticePeriod: 30,
      totalExp: sourced.totalExp || 5,
      skills: sourced.skills || [],
      education: 'B.Tech Computer Science',
      status: CandidateStatus.Screening,
      matchScore: 85,
      aiFeedback: sourced.aiFeedback,
      experienceLevel: (sourced.totalExp || 5) > 8 ? 'Senior' : 'Mid'
    };
    setCandidates([newCandidate, ...candidates]);
    setSourcedCandidates(prev => prev.filter(c => c.name !== sourced.name));
  };

  const handleSendMessage = async () => {
    if (!currentQuery.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: currentQuery, timestamp: new Date().toISOString() };
    setChatHistory([...chatHistory, userMsg]);
    setCurrentQuery('');
    setIsTyping(true);
    
    const response = await askRecruitmentAssistant(currentQuery, { jobs, candidates });
    const botMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
    setChatHistory(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  const [newJob, setNewJob] = useState<Partial<Job>>({
    title: '',
    department: 'Engineering',
    location: '',
    minExp: 2,
    maxExp: 5,
    ctcRange: { min: 12, max: 25 },
    skills: [],
  });

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    const job: Job = {
      ...(newJob as Job),
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      activeCandidates: 0,
      diversityGoal: 50,
      skills: (newJob.skills as any).toString().split(',').map((s: string) => s.trim()),
    };
    setJobs([job, ...jobs]);
    setShowCreateJobModal(false);
    setActiveTab('jobs');
  };

  const handleScreening = async () => {
    if (!screeningText) return;
    setIsScreening(true);
    try {
      const result = await screenResume(screeningText, jobs[0]);
      setScreeningResult(result);
      const questions = await generateInterviewQuestions({ skills: result.strengths, totalExp: 5, name: 'Applicant' } as any, jobs[0]);
      setInterviewQuestions(questions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScreening(false);
    }
  };

  const SUCCESS_DATA = [
    { name: 'Jan', value: 85 },
    { name: 'Feb', value: 88 },
    { name: 'Mar', value: 92 },
    { name: 'Apr', value: 94 },
  ];

  const PIPELINE_DATA = [
    { name: 'Sourced', count: 120 },
    { name: 'Screened', count: 45 },
    { name: 'Interview', count: 12 },
    { name: 'Assessed', count: 8 },
    { name: 'Offer', count: 3 },
  ];

  const DIVERSITY_DATA = [
    { name: 'Male', value: 55 },
    { name: 'Female', value: 40 },
    { name: 'Other', value: 5 },
  ];

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userEmail && password) {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500" />
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-200">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">HireFlow <span className="text-indigo-600 italic">Pro</span></h1>
            <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">Enterprise Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Official Email</label>
              <input 
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                placeholder="recruiter@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Access Token</label>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                placeholder="••••••••••••"
              />
              <p className="text-[10px] text-indigo-500 font-bold text-center mt-2 px-4 transition-opacity group-hover:opacity-100">
                Tip: Enter any email and password for demo access
              </p>
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Authenticate
            </button>

            <div className="relative my-8">
               <div className="absolute inset-0 flex items-center">
                 <div className="w-full border-t border-slate-100"></div>
               </div>
               <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                 <span className="bg-white px-4 text-slate-400">Or Connect With</span>
               </div>
            </div>

            <button 
              type="button"
              onClick={handleGitHubLogin}
              className="w-full bg-slate-100 text-slate-700 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 border border-slate-200"
            >
              <Zap size={18} className="text-amber-500" />
              Sign in with GitHub
            </button>
          </form>

          <p className="text-center text-[10px] text-slate-400 mt-10 font-bold uppercase tracking-tighter italic">
            Secure recruitment portal • v2.0.4-LTS
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">HireFlow <span className="text-indigo-400">Pro</span></h1>
          </div>
          
          <nav className="space-y-2">
            <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={<Briefcase size={18} />} label="Jobs Portal" active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} />
            <NavItem icon={<Users size={18} />} label="Talent Pool" active={activeTab === 'candidates'} onClick={() => setActiveTab('candidates')} />
            <NavItem icon={<Calendar size={18} />} label="Interviews" active={activeTab === 'interviews'} onClick={() => setActiveTab('interviews')} />
            <NavItem icon={<Sparkles size={18} />} label="AI Screening" active={activeTab === 'screening'} onClick={() => setActiveTab('screening')} />
            <NavItem icon={<Zap size={18} />} label="Automations" active={activeTab === 'automation'} onClick={() => setActiveTab('automation')} />
            <NavItem icon={<BarChart3 size={18} />} label="Analytics Pro" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          </nav>
        </div>
        
        <div className="mt-auto p-8">
          <button 
            onClick={() => setShowAssistant(true)}
            className="w-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 p-4 rounded-2xl flex items-center gap-3 hover:bg-indigo-500/20 transition-all mb-6 group"
          >
            <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest text-left">Ask HireBot AI</span>
          </button>
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise API</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-white font-medium mb-3">Usage: 84%</p>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-indigo-500 w-[84%]" />
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all border border-rose-500/20"
            >
              <LogOut size={12} />
              Log Out Session
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 capitalize italic">{activeTab}</h2>
            <div className="h-6 w-px bg-slate-200" />
            <p className="text-xs text-slate-400 font-medium">Q2 Recruitment Cycle - FY 2026</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">+5</div>
            </div>
            <button 
              onClick={() => setShowCreateJobModal(true)}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:scale-105 transition-transform"
            >
              Post New Role
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 sm:p-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Live roles" value="12" icon={<Briefcase />} change="+24%" sub="Active sourcing" />
                  <StatCard label="Pipeline" value="842" icon={<Users />} change="+12.5%" sub="Applied today" />
                  <StatCard label="AI Efficiency" value="94%" icon={<Target />} change="Optimal" sub="Token usage" />
                  <StatCard label="Mean Time-to-Hire" value="18d" icon={<Clock />} change="-2 days" sub="Company avg" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2">
                      <TrendingUp size={20} className="text-indigo-500" />
                      Recruitment Funnel
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={PIPELINE_DATA}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <Tooltip 
                             cursor={{ fill: '#f8fafc' }}
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-8">Diversity Analytics</h3>
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={DIVERSITY_DATA} 
                            innerRadius={60} 
                            outerRadius={80} 
                            paddingAngle={5} 
                            dataKey="value"
                            stroke="none"
                          >
                            {DIVERSITY_DATA.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {DIVERSITY_DATA.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-xs font-semibold text-slate-600">{d.name} {d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'screening' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-fit">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold text-slate-900">Advanced AI Screener</h2>
                      <Sparkles className="text-amber-500 animate-pulse" size={24} />
                    </div>
                    <p className="text-slate-500 text-sm">Target: <span className="font-bold text-indigo-600 underline">Sr. Full Stack Dev (Bangalore)</span></p>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <textarea 
                      placeholder="Paste PDF text or raw resume content..."
                      className="w-full h-80 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 text-sm focus:border-indigo-500 focus:bg-white transition-all outline-none font-mono resize-none shadow-inner"
                      value={screeningText}
                      onChange={(e) => setScreeningText(e.target.value)}
                    />
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setScreeningText(`ARJUN MEHTA\nSenior Full Stack Developer\n\nEXPERIENCE:\n6+ years at TechSolutions India. Lead a team of 4 to migrate legacy PHP to React/Node.js stack on AWS. Improved build times by 40%.\n\nSKILLS:\nReact, TypeScript, Node.js, PostgreSQL, Docker, AWS, GraphQL.\n\nEDUCATION:\nB.Tech from IIT Bombay (2018).\n\nCURRENT CTC: 32 LPA\nNOTICE PERIOD: 30 Days`)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100 cursor-pointer"
                      >
                        Load Sample Resume
                      </button>
                      <button 
                        onClick={() => setScreeningText('')}
                        className="px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    
                    <button 
                      onClick={handleScreening}
                      disabled={isScreening || !screeningText}
                      className="w-full relative overflow-hidden group bg-slate-900 text-white py-5 rounded-3xl font-black text-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
                    >
                      {isScreening ? 'Propagating AI Models...' : 'Initiate Deep Analysis'}
                      {isScreening && <div className="absolute inset-0 bg-indigo-500/20 animate-pulse" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {screeningResult ? (
                    <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${screeningResult.verdict === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            Verdict: {screeningResult.verdict}
                          </div>
                          <div className="text-4xl font-black text-indigo-600">{screeningResult.matchScore}%</div>
                        </div>
                        <p className="text-slate-700 text-sm italic border-l-4 border-indigo-500 pl-4 py-1">{screeningResult.summary}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <DetailCard title="Strengths" items={screeningResult.strengths} type="good" />
                         <DetailCard title="Skill Gaps" items={screeningResult.missingSkills} type="bad" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">AI Success Predictor</span>
                          <div className="text-xl font-black text-indigo-600">{screeningResult.successProbability || 85}%</div>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Retention Risk</span>
                          <div className={`text-xl font-black ${screeningResult.retentionRisk === 'Low' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {screeningResult.retentionRisk || 'Low'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
                        <h4 className="flex items-center gap-2 font-bold mb-6 italic">
                          <MessageSquare size={18} />
                          AI-Generated Interview Strategy
                        </h4>
                        <div className="space-y-4">
                          {interviewQuestions.map((q, i) => (
                            <div key={i} className="flex gap-4 items-start">
                              <span className="text-indigo-400 font-mono text-sm">Q{i+1}</span>
                              <p className="text-xs opacity-90 leading-relaxed font-medium">{q}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-white/50 border border-dashed border-slate-200 h-full rounded-3xl flex flex-center items-center justify-center text-slate-300 font-bold italic p-20 text-center">
                      Analysis report will appear here after screening...
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === 'analytics' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <h3 className="text-xl font-bold mb-8">Role Success Prediction</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={SUCCESS_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Time-to-Hire (Avg Days)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={SUCCESS_DATA}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ r: 6, fill: '#4f46e5' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Retention Heatmap</h3>
                    <div className="flex flex-col gap-4">
                      {['Engineering', 'Product', 'Sales'].map(dept => (
                        <div key={dept} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-600">{dept}</span>
                          <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[95%]" />
                          </div>
                          <span className="text-xs font-bold text-emerald-600">95%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'jobs' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Active Roles</h3>
                    <p className="text-slate-500 text-sm">Managing {jobs.length} high-priority openings</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white transition-all">Filter: All Departments</button>
                    <button 
                      onClick={() => setShowCreateJobModal(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:scale-105 transition-transform"
                    >
                      Add New Role
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {jobs.map((job) => (
                    <div key={job.id} className="bg-white rounded-[32px] border border-slate-200 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                       <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-700" />
                       <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
                              {job.department}
                            </span>
                            <h4 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase italic">{job.title}</h4>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                             <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Pool</div>
                             <div className="text-2xl font-black text-indigo-600">{job.activeCandidates || 12}</div>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleSourceCandidates(job);
                               }}
                               className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform"
                             >
                                <Sparkles size={12} />
                                Source AI
                             </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-8">
                          {job.skills.map(skill => (
                            <span key={skill} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-xs font-bold text-slate-500">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1"><MapPin size={14} className="text-indigo-500" /> {job.location}</span>
                            <span className="flex items-center gap-1"><IndianRupee size={14} className="text-emerald-500" /> {job.ctcRange.min}-{job.ctcRange.max}LPA</span>
                          </div>
                          <button className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                            Full Pipeline <ChevronRight size={16} />
                          </button>
                        </div>
                       </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'candidates' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                 <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                   <div>
                     <h3 className="text-2xl font-black text-slate-900">Talent Pool</h3>
                     <p className="text-slate-500 text-sm">Predictive analysis for {candidates.length} vetted candidates</p>
                   </div>
                   <div className="flex gap-4">
                      {selectedCandidateIds.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 bg-indigo-600 px-6 py-2 rounded-xl text-white shadow-xl shadow-indigo-100"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">{selectedCandidateIds.length} Selected</span>
                          <div className="w-px h-4 bg-indigo-400 mx-2" />
                          <div className="flex gap-2">
                             <select 
                               onChange={(e) => handleBulkMoveStage(e.target.value as CandidateStatus)}
                               className="bg-indigo-700 border-none rounded-lg text-[10px] font-black uppercase tracking-widest px-2 py-1 outline-none"
                               value=""
                             >
                                <option value="" disabled>Move To...</option>
                                {['Applied', 'Screening', 'Interviewing', 'Offered', 'Hired'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                             </select>
                             <button 
                              onClick={handleBulkEmail}
                              className="bg-indigo-700 hover:bg-indigo-800 transition-colors rounded-lg p-1.5 flex items-center gap-1"
                             >
                               <Mail size={12} />
                               <span className="text-[10px] font-black uppercase tracking-widest">Email</span>
                             </button>
                             <button 
                              onClick={() => setSelectedCandidateIds([])}
                              className="text-indigo-200 hover:text-white transition-colors"
                             >
                               <X size={14} />
                             </button>
                          </div>
                        </motion.div>
                      )}
                      <div className="bg-slate-100 p-1 rounded-xl flex">
                        <button 
                          onClick={() => setTalentViewMode('grid')}
                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${talentViewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                          Grid
                        </button>
                        <button 
                          onClick={() => setTalentViewMode('pipeline')}
                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${talentViewMode === 'pipeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                          Pipeline
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Search by name, skill..." className="pl-10 bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
                      </div>
                   </div>
                 </div>

                {talentViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {candidates.map(candidate => (
                      <motion.div 
                        key={candidate.id} 
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedCandidate(candidate)}
                        className={`bg-white p-8 rounded-[38px] border transition-all cursor-pointer group relative ${selectedCandidateIds.includes(candidate.id) ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:shadow-2xl'}`}
                      >
                        <div className="absolute top-6 left-6 z-10">
                          <button 
                            onClick={(e) => toggleCandidateSelection(candidate.id, e)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedCandidateIds.includes(candidate.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-transparent opacity-0 group-hover:opacity-100'}`}
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                        </div>
                        <div className="flex items-start justify-between mb-8 pl-8">
                          <div className="w-16 h-16 bg-slate-900 rounded-[20px] flex items-center justify-center font-black text-white text-xl shadow-lg shadow-slate-200 group-hover:rotate-6 transition-transform">
                             {candidate.name[0]}
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Match Index</div>
                             <div className="text-3xl font-black text-indigo-600">{candidate.matchScore}%</div>
                          </div>
                        </div>

                        <div className="mb-6">
                          <h4 className="text-xl font-bold text-slate-900 mb-1">{candidate.name}</h4>
                          <div className="flex items-center gap-2">
                             <MapPin size={12} className="text-slate-400" />
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{candidate.education.split(' - ')[1]}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-8">
                          {candidate.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black uppercase tracking-tighter">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Retention</p>
                            <span className={`text-xs font-bold ${candidate.retentionRisk === 'Low' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {candidate.retentionRisk || 'Low'} Risk
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Experience</p>
                            <span className="text-xs font-bold text-slate-700">{candidate.totalExp} Years</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                    {['Applied', 'Screening', 'Interviewing', 'Offered', 'Hired'].map((stage) => (
                      <div key={stage} className="min-w-[320px] bg-slate-50 rounded-[40px] p-6 flex flex-col h-[600px]">
                        <div className="flex items-center justify-between mb-6 px-2">
                           <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">{stage}</h4>
                           <span className="bg-white border border-slate-200 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                             {candidates.filter(c => c.status === stage).length}
                           </span>
                        </div>
                        
                        <div className="space-y-4 overflow-y-auto pr-1">
                           {candidates.filter(c => c.status === stage).map(candidate => (
                             <motion.div 
                               key={candidate.id}
                               layoutId={candidate.id}
                               onClick={() => setSelectedCandidate(candidate)}
                               className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer group relative ${selectedCandidateIds.includes(candidate.id) ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 shadow-sm hover:shadow-md'}`}
                             >
                                <div className="absolute -top-2 -left-2 z-10">
                                  <button 
                                    onClick={(e) => toggleCandidateSelection(candidate.id, e)}
                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedCandidateIds.includes(candidate.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-transparent opacity-0 group-hover:opacity-100'}`}
                                  >
                                    <Check size={12} strokeWidth={4} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="text-xs font-black text-slate-900 opacity-60 italic tracking-tighter">
                                    {candidate.matchScore}% AI Match
                                  </div>
                                  <div className={`w-2 h-2 rounded-full ${candidate.retentionRisk === 'Low' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                </div>
                                <h5 className="font-bold text-slate-900 mb-1">{candidate.name}</h5>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{candidate.education.split(' - ')[0]}</p>
                                
                                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                   <div className="flex -space-x-1">
                                      {candidate.skills.slice(0, 2).map(s => (
                                        <div key={s} className="w-6 h-6 rounded-full bg-indigo-50 border border-white flex items-center justify-center text-[8px] font-bold text-indigo-600 uppercase">
                                          {s[0]}
                                        </div>
                                      ))}
                                   </div>
                                   <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Details</button>
                                </div>
                             </motion.div>
                           ))}
                           <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-400 transition-all">
                              + Drop Talent Here
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'interviews' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                 <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                   <div>
                     <h3 className="text-2xl font-black text-slate-900">Interview Scheduler</h3>
                     <p className="text-slate-500 text-sm">{interviews.length} sessions scheduled this week</p>
                   </div>
                   <button 
                    onClick={() => setShowScheduleInterviewModal(true)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-xl shadow-indigo-100 hover:scale-105 transition-transform flex items-center gap-2"
                   >
                     <Plus size={16} />
                     Schedule Session
                   </button>
                 </div>

                 <div className="grid grid-cols-1 gap-6">
                    {interviews.map((interview) => {
                      const candidate = candidates.find(c => c.id === interview.candidateId);
                      const job = jobs.find(j => j.id === interview.jobId);
                      return (
                        <div key={interview.id} className="bg-white p-8 rounded-[40px] border border-slate-200 flex items-center justify-between group hover:shadow-xl transition-all">
                          <div className="flex items-center gap-8">
                            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-black text-xl">
                              {candidate?.name[0]}
                            </div>
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <h4 className="text-xl font-bold text-slate-900">{candidate?.name}</h4>
                                 <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-tighter">{interview.type} Round</span>
                               </div>
                               <p className="text-sm text-slate-500 font-medium">{job?.title} • <span className="text-indigo-600">{job?.department}</span></p>
                            </div>
                          </div>

                          <div className="flex items-center gap-12">
                            <div className="text-center">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date & Time</div>
                              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-500" />
                                {interview.date} @ {interview.time}
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Interviewer</div>
                              <div className="text-sm font-bold text-slate-700">{interview.interviewer}</div>
                            </div>

                              <div className="flex items-center gap-3">
                                {interview.meetingLink && (
                                  <a 
                                    href={interview.meetingLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
                                  >
                                    <Video size={18} />
                                  </a>
                                )}
                                <button 
                                  onClick={() => {
                                    setActiveInterviewForFeedback(interview);
                                    setShowFeedbackModal(true);
                                  }}
                                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                  {interview.status === 'Completed' ? <CheckCircle2 size={14} /> : <ClipboardList size={14} />}
                                  {interview.status === 'Completed' ? 'Feedback Sent' : 'Add Feedback'}
                                </button>
                              </div>
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </motion.div>
            )}

            {activeTab === 'automation' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                 <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                   <div>
                     <h3 className="text-2xl font-black text-slate-900">Workflow Automations</h3>
                     <p className="text-slate-500 text-sm">Active AI agents monitoring your pipeline {automations.length}</p>
                   </div>
                   <button 
                    onClick={() => setShowCreateAutomationModal(true)}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-xl shadow-slate-200 hover:scale-105 transition-transform"
                   >
                     Create New Trigger
                   </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {automations.map((auto: AutomationRule) => (
                      <div key={auto.id} className="bg-white p-8 rounded-[40px] border border-slate-200 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 ${auto.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        <div className="flex items-start justify-between mb-8">
                          <div className={`p-4 rounded-2xl ${auto.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                            <Zap size={24} />
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{auto.isActive ? 'Active' : 'Paused'}</span>
                             <div className={`w-3 h-3 rounded-full ${auto.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          </div>
                        </div>

                        <h4 className="text-xl font-black text-slate-900 mb-2">{auto.name}</h4>
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                          When <span className="text-indigo-600 font-bold">{auto.trigger.replace('_', ' ')}</span>, if <span className="italic font-medium">"{auto.condition}"</span>, then <span className="bg-indigo-50 px-2 py-0.5 rounded text-indigo-700 font-bold">{auto.action.replace('_', ' ')}</span>.
                        </p>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                           <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             Last triggered: 2h ago
                           </div>
                           <button className="text-xs font-black text-indigo-600 hover:tracking-widest transition-all">CONFIGURE</button>
                        </div>
                      </div>
                    ))}
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HireBot Assistant Sidebar/Modal */}
        <AnimatePresence>
          {showAssistant && (
            <div className="fixed inset-0 z-[70] flex justify-end">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setShowAssistant(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: 500 }}
                animate={{ x: 0 }}
                exit={{ x: 500 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg">HireBot AI</h3>
                      <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Always Online</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAssistant(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                        <MessageSquare size={32} />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">How can I help you today?</h4>
                      <p className="text-sm text-slate-400 px-10">Ask me to synthesize a candidate, check a pipeline, or suggest roles for Aradhya.</p>
                      
                      <div className="mt-10 space-y-3">
                        {['Who are the best React candidates?', 'Summarize our engineering pipeline', 'Tell me about Aradhya\'s retention risk'].map(q => (
                          <button 
                            key={q} 
                            onClick={() => setCurrentQuery(q)}
                            className="w-full text-left p-4 rounded-2xl border border-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-slate-100 text-slate-700 rounded-bl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 p-4 rounded-2xl flex gap-1">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 border-t border-slate-100">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={currentQuery}
                      onChange={e => setCurrentQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="w-full bg-slate-100 rounded-2xl py-4 pl-6 pr-14 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button 
                      onClick={handleSendMessage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:scale-105 transition-transform"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 mt-4 italic">HireBot may provide information that should be verified by a human recruiter.</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Candidate Modal */}
        <AnimatePresence>
          {selectedCandidate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setSelectedCandidate(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-indigo-200">
                      {selectedCandidate.name[0]}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 mb-1">{selectedCandidate.name}</h2>
                      <p className="text-slate-500 font-medium">{selectedCandidate.currentStage}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCandidate(null)}
                    className="p-3 hover:bg-slate-200 rounded-3xl transition-colors text-slate-400"
                  >
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-3 gap-10">
                  <div className="col-span-2 space-y-8">
                    <section>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">AI Talent Insight</h4>
                      <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 italic text-slate-700 leading-relaxed">
                        "{selectedCandidate.aiFeedback}"
                      </div>
                    </section>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Cultural Alignment</span>
                        <div className="text-2xl font-black text-slate-900">{selectedCandidate.culturalFitScore}%</div>
                      </div>
                      <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Retention Probability</span>
                        <div className={`text-2xl font-black ${selectedCandidate.retentionRisk === 'Low' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {selectedCandidate.retentionRisk === 'Low' ? '92%' : '45%'}
                        </div>
                      </div>
                    </div>

                    <section>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Team Collaboration</h4>
                      <div className="space-y-4">
                        {selectedCandidate.comments?.map((c, i) => (
                          <div key={i} className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
                            <div className="flex-1 bg-slate-50 rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-900">{c.author}</span>
                                <span className="text-[10px] text-slate-400">{c.date}</span>
                              </div>
                              <p className="text-xs text-slate-600">{c.text}</p>
                            </div>
                          </div>
                        ))}
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Add a private team comment..."
                            className="w-full bg-slate-100 rounded-2xl py-4 flex items-center px-6 text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-600">
                             <MessageSquare size={18} />
                          </button>
                        </div>
                      </div>
                    </section>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white">
                      <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-50">Success Predictor</h4>
                      <div className="flex items-center justify-center mb-6">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                            <circle 
                              cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                              strokeDasharray={`${(selectedCandidate.successProbability || 0) * 3.64} 364`}
                              className="text-indigo-500" 
                            />
                          </svg>
                          <span className="absolute text-2xl font-black">{selectedCandidate.successProbability}%</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-center opacity-60 italic">Estimated performance in first 180 days based on historical tenure at IIT Bombay alumni data.</p>
                    </div>

                    <div className="space-y-3">
                       <button className="w-full py-4 text-center text-sm font-bold bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:scale-105 transition-transform">
                         Move to Next Stage
                       </button>
                       <button className="w-full py-4 text-center text-sm font-bold bg-white border border-slate-200 text-slate-900 rounded-2xl hover:bg-slate-50 transition-colors">
                         View Source Profile
                       </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Create Job Modal */}
        <AnimatePresence>
          {showCreateJobModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-8">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateJobModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden p-10"
              >
                <div className="mb-10">
                  <h2 className="text-3xl font-black text-slate-900">Post a Role</h2>
                  <p className="text-slate-500 font-medium">Broadcast to LinkedIn, Naukri, and internal talent pools.</p>
                </div>

                <form onSubmit={handleCreateJob} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Job Title</label>
                      <input 
                        required
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. Lead Frontend Engineer"
                        value={newJob.title}
                        onChange={e => setNewJob({...newJob, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Location</label>
                      <input 
                        required
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Bangalore / Remote"
                        value={newJob.location}
                        onChange={e => setNewJob({...newJob, location: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Skills (Comma separated)</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      placeholder="React, Tailwind, Node.js"
                      value={newJob.skills as any}
                      onChange={e => setNewJob({...newJob, skills: e.target.value as any})}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center pr-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Job Description</label>
                      <button 
                        type="button"
                        onClick={handleGenerateJD}
                        disabled={isGeneratingJD || !newJob.title}
                        className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all disabled:opacity-50"
                      >
                        <Sparkles size={12} />
                        {isGeneratingJD ? 'Generating...' : 'AI Architect'}
                      </button>
                    </div>
                    <textarea 
                      required
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium"
                      placeholder="Enter detailed job requirements or use AI Architect..."
                      value={newJob.description}
                      onChange={e => setNewJob({...newJob, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Experience (Min-Max)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-sm" value={newJob.minExp} onChange={e => setNewJob({...newJob, minExp: parseInt(e.target.value)})} />
                        <span className="text-slate-300">-</span>
                        <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-sm" value={newJob.maxExp} onChange={e => setNewJob({...newJob, maxExp: parseInt(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">CTC Range (LPA)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-sm" value={newJob.ctcRange?.min} onChange={e => setNewJob({...newJob, ctcRange: { ...newJob.ctcRange!, min: parseInt(e.target.value) }})} />
                        <span className="text-slate-300">-</span>
                        <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-sm" value={newJob.ctcRange?.max} onChange={e => setNewJob({...newJob, ctcRange: { ...newJob.ctcRange!, max: parseInt(e.target.value) }})} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowCreateJobModal(false)}
                      className="flex-1 py-5 rounded-3xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all text-lg"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-5 rounded-3xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all text-lg shadow-xl shadow-indigo-100"
                    >
                      Publish Role
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showScheduleInterviewModal && (
            <div className="fixed inset-0 z-[75] flex items-center justify-center p-8">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setShowScheduleInterviewModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10"
              >
                <div className="mb-10">
                  <h2 className="text-3xl font-black text-slate-900">Schedule Interview</h2>
                  <p className="text-slate-500 font-medium">Coordinate a session between candidate and panel.</p>
                </div>

                <form onSubmit={handleScheduleInterview} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Select Candidate</label>
                      <select 
                        required
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        value={newInterview.candidateId}
                        onChange={e => setNewInterview({...newInterview, candidateId: e.target.value})}
                      >
                        <option value="">Select Candidate</option>
                        {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Job Role</label>
                      <select 
                        required
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        value={newInterview.jobId}
                        onChange={e => setNewInterview({...newInterview, jobId: e.target.value})}
                      >
                        <option value="">Select Role</option>
                        {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Date</label>
                      <input 
                        type="date"
                        required
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newInterview.date}
                        onChange={e => setNewInterview({...newInterview, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Time</label>
                      <input 
                        type="time"
                        required
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newInterview.time}
                        onChange={e => setNewInterview({...newInterview, time: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Interview Type</label>
                      <select 
                        required
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        value={newInterview.type}
                        onChange={e => setNewInterview({...newInterview, type: e.target.value as any})}
                      >
                        <option value="Technical">Technical Round</option>
                        <option value="HR">HR Round</option>
                        <option value="Managerial">Managerial Round</option>
                        <option value="Final">Final Interview</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Interviewer Name</label>
                      <input 
                        required
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. Satish G."
                        value={newInterview.interviewer}
                        onChange={e => setNewInterview({...newInterview, interviewer: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowScheduleInterviewModal(false)}
                      className="flex-1 py-4 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all text-sm uppercase"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all text-sm shadow-xl shadow-indigo-100 uppercase"
                    >
                      Confirm Session
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCreateAutomationModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-8">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateAutomationModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-10"
              >
                <div className="mb-10">
                  <h2 className="text-3xl font-black text-slate-900">New Automation</h2>
                  <p className="text-slate-500 font-medium">Define a new AI trigger for your pipeline.</p>
                </div>

                <form onSubmit={handleCreateAutomation} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Trigger Name</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Reject low match engineering applicants"
                      value={newAutomation.name}
                      onChange={e => setNewAutomation({...newAutomation, name: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">When</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        value={newAutomation.trigger}
                        onChange={e => setNewAutomation({...newAutomation, trigger: e.target.value as any})}
                      >
                        <option value="on_applied">Candidate Applies</option>
                        <option value="on_matched">AI Matches Role</option>
                        <option value="on_interview_complete">Interview Ends</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Then</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        value={newAutomation.action}
                        onChange={e => setNewAutomation({...newAutomation, action: e.target.value as any})}
                      >
                        <option value="move_to_stage">Move to Stage</option>
                        <option value="send_email">Send Email</option>
                        <option value="notify_slack">Slack Alert</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">IF Condition (Plain English)</label>
                    <textarea 
                      required
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="Match score is below 40%..."
                      value={newAutomation.condition}
                      onChange={e => setNewAutomation({...newAutomation, condition: e.target.value})}
                    />
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowCreateAutomationModal(false)}
                      className="flex-1 py-4 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all text-sm uppercase"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all text-sm shadow-xl shadow-indigo-100 uppercase"
                    >
                      Activate Trigger
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Feedback Scorecard Modal */}
        <AnimatePresence>
          {showFeedbackModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-8">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowFeedbackModal(false);
                  setActiveInterviewForFeedback(null);
                }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-y-auto max-h-[90vh]"
              >
                <div className="mb-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">Scorecard</h2>
                    <p className="text-slate-500 font-medium tracking-tight">Structured feedback for {candidates.find(c => c.id === activeInterviewForFeedback?.candidateId)?.name}</p>
                  </div>
                  <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                     <ClipboardList size={24} />
                  </div>
                </div>

                <form onSubmit={handleSubmitFeedback} className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Technical Skills</label>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(star => (
                           <button 
                            key={star}
                            type="button"
                            onClick={() => setNewFeedback({...newFeedback, technicalSkillsRating: star})}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${newFeedback.technicalSkillsRating! >= star ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400'}`}
                           >
                             {star}
                           </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Cultural Fit</label>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(star => (
                           <button 
                            key={star}
                            type="button"
                            onClick={() => setNewFeedback({...newFeedback, culturalFitRating: star})}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${newFeedback.culturalFitRating! >= star ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400'}`}
                           >
                             {star}
                           </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-2">Key Strengths (Pros)</label>
                      <div className="flex flex-wrap gap-2">
                        {PRO_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleFeedbackTag('pros', opt)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${newFeedback.pros?.includes(opt) ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest pl-2">Areas for Improvement (Cons)</label>
                      <div className="flex flex-wrap gap-2">
                        {CON_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleFeedbackTag('cons', opt)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${newFeedback.cons?.includes(opt) ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Hiring Decision</label>
                    <div className="grid grid-cols-4 gap-3">
                      {['Strong Hire', 'Hire', 'Neutral', 'No Hire'].map(decision => (
                        <button 
                          key={decision}
                          type="button"
                          onClick={() => setNewFeedback({...newFeedback, decision: decision as any})}
                          className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all ${newFeedback.decision === decision ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}
                        >
                          {decision}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Detailed Summary</label>
                    <textarea 
                      required
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium"
                      placeholder="Discuss candidate strengths, weaknesses, and rationale for the decision..."
                      value={newFeedback.summary}
                      onChange={e => setNewFeedback({...newFeedback, summary: e.target.value})}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowFeedbackModal(false);
                        setActiveInterviewForFeedback(null);
                      }}
                      className="flex-1 py-4 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all text-xs uppercase"
                    >
                      Dismiss
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-4 rounded-2xl font-black text-white bg-slate-900 hover:bg-black transition-all text-xs shadow-2xl uppercase tracking-widest"
                    >
                      Submit Evaluation
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Sourcing Modal */}
        <AnimatePresence>
          {showSourcingModal && (
            <div className="fixed inset-0 z-[85] flex items-center justify-center p-8">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowSourcingModal(false);
                  setSourcedCandidates([]);
                }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 50 }}
                className="relative bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-amber-200">
                      <Sparkles size={32} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900">AI Deep Sourcing</h2>
                      <p className="text-slate-500 font-medium">Auto-scouting top talent for <span className="text-amber-600 font-bold">{activeJobForSourcing?.title}</span></p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowSourcingModal(false);
                      setSourcedCandidates([]);
                    }}
                    className="p-3 hover:bg-slate-200 rounded-3xl transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10">
                  {isSourcing ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
                       <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                       <div>
                         <h3 className="text-xl font-bold text-slate-900">Analyzing external talent protocols...</h3>
                         <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">Checking LinkedIn, GitHub, and Twitter/X for top candidates matching your active job requirement.</p>
                       </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {sourcedCandidates.map((sourced, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          key={idx}
                          className="bg-white border border-slate-200 rounded-[32px] p-6 flex flex-col"
                        >
                          <div className="flex items-center gap-4 mb-6">
                             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-lg">
                               {sourced.name[0]}
                             </div>
                             <div>
                               <h4 className="font-bold text-slate-900 leading-tight">{sourced.name}</h4>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{sourced.headline}</p>
                             </div>
                          </div>
                          
                          <div className="space-y-4 mb-6 flex-1">
                             <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience</span>
                                <span className="text-xs font-bold text-slate-700">{sourced.totalExp} Years</span>
                             </div>
                             <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <Sparkles size={10} /> AI Match Rationale
                                </h5>
                                <p className="text-[11px] text-slate-600 leading-relaxed italic">"{sourced.aiFeedback}"</p>
                             </div>
                             <div className="flex flex-wrap gap-1.5">
                               {sourced.skills.map(s => (
                                 <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">{s}</span>
                               ))}
                             </div>
                          </div>

                          <div className="space-y-2">
                             <button 
                               onClick={() => handleImportCandidate(sourced)}
                               className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                             >
                               Import to Pool
                             </button>
                             <div className="flex gap-2">
                               <a href={sourced.linkedin} target="_blank" className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase text-center border border-slate-100 hover:bg-slate-100 transition-all">LinkedIn</a>
                               <a href={sourced.github} target="_blank" className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase text-center border border-slate-100 hover:bg-slate-100 transition-all">GitHub</a>
                             </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all group ${
      active ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}>
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, change, sub }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
            {React.cloneElement(icon as React.ReactElement, { size: 24 })}
          </div>
          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-tighter">
            {change}
          </span>
        </div>
        <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{value}</div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</div>
        <p className="text-[10px] text-slate-400 mt-4 italic">{sub}</p>
      </div>
    </div>
  );
}

function DetailCard({ title, items, type }: any) {
  return (
    <div className={`p-6 rounded-3xl border ${type === 'good' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
      <h5 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${type === 'good' ? 'text-emerald-700' : 'text-rose-700'}`}>
        {title}
      </h5>
      <div className="space-y-2">
        {items.map((item: string, i: number) => (
          <div key={i} className="flex gap-2 items-start shrink-0">
             <div className={`w-1 h-1 rounded-full mt-1.5 ${type === 'good' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
             <span className="text-xs font-medium text-slate-700">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
