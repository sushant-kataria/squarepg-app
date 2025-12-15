import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { X, Send, Sparkles, Loader2, Bot } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';
import { Tenant, Room, Payment, Expense } from '../types';

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your PG Assistant. I have access to your live dashboard data. Ask me about occupancy, revenue, or specific tenants.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch Real Data
  const { data: tenants } = useSupabase<Tenant>('tenants');
  const { data: rooms } = useSupabase<Room>('rooms');
  const { data: payments } = useSupabase<Payment>('payments');
  const { data: expenses } = useSupabase<Expense>('expenses');

  const apiKey = process.env.API_KEY || ''; 
  const ai = new GoogleGenAI({ apiKey });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!apiKey) {
       setMessages(prev => [...prev, { role: 'user', text: input }, { role: 'model', text: 'API Key is missing from environment.' }]);
       setInput('');
       return;
    }

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Calculate Summary Stats for Context
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
      const pendingTenants = tenants.filter(t => t.rentStatus === 'Pending' || t.rentStatus === 'Overdue');
      
      const context = `
        You are an AI assistant for a PG (Paying Guest) Management Dashboard.
        Use the following REAL-TIME database information to answer the user's question.
        
        CURRENT STATUS:
        - Total Tenants: ${tenants.length}
        - Total Rooms: ${rooms.length}
        - Occupied Rooms: ${occupiedRooms}
        - Total All-Time Revenue: ₹${totalRevenue}
        - Total All-Time Expenses: ₹${totalExpenses}
        
        TENANT LIST (Name, Room, Status, Rent Status, Phone):
        ${tenants.map(t => `- ${t.name} (Room ${t.roomNumber}): ${t.status}, Rent: ${t.rentStatus}, Phone: ${t.phone}`).join('\n')}

        ROOM LIST (Number, Type, Status, Price):
        ${rooms.map(r => `- ${r.number} (${r.type}): ${r.status}, ₹${r.price}`).join('\n')}

        User Query: ${userMessage}
        
        Instructions:
        - Be concise, professional, and helpful.
        - If asked about revenue, specify if you are referring to all-time or specific data available.
        - If asked about a specific tenant, look them up in the list above.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: context,
      });

      const text = response.text || "I'm sorry, I couldn't generate a response based on the current data.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error connecting to the AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background w-full max-w-lg h-[80vh] sm:h-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="bg-primary p-4 flex justify-between items-center text-primary-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <h3 className="font-semibold text-sm">AshirwadPG Assistant</h3>
          </div>
          <button onClick={onClose} className="hover:bg-primary-foreground/10 p-1 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : 'bg-card border border-border text-card-foreground rounded-bl-sm shadow-sm'
              }`}>
                {msg.role === 'model' && <Bot className="w-4 h-4 mb-2 text-primary" />}
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                   {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-card border border-border p-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                 <Loader2 className="w-3 h-3 animate-spin text-primary" />
                 <span className="text-xs text-muted-foreground font-mono">Analyzing Database...</span>
               </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-background border-t border-border">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Who hasn't paid rent yet?"
              className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              autoFocus
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground p-2.5 rounded-lg transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;