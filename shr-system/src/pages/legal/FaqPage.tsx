import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, HelpCircle, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FAQ_ROLE_LABELS, FAQ_ROLE_ORDER, ROLE_FAQS } from '../../data/faqByRole';
import type { UserRole } from '../../types/types';

const ROLE_HOME: Record<UserRole, string> = {
  student: '/student/dashboard',
  medical_staff: '/staff/dashboard',
  technician: '/technician/upload',
  pharmacy: '/pharmacy/queue',
  specialist: '/specialist/dashboard',
  admin: '/admin/dashboard',
};

export default function FaqPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(FAQ_ROLE_ORDER[0]);

  useEffect(() => {
    if (currentUser) {
      setSelectedRole(currentUser.role);
      return;
    }

    setSelectedRole(FAQ_ROLE_ORDER[0]);
  }, [currentUser]);

  const rolesInView = currentUser ? [currentUser.role] : FAQ_ROLE_ORDER;
  const activeRole = currentUser ? currentUser.role : selectedRole;

  const filteredFaqs = useMemo(() => {
    const roleFaqs = ROLE_FAQS[activeRole] ?? [];
    const search = query.trim().toLowerCase();

    if (!search) return roleFaqs;

    return roleFaqs.filter((faq) => {
      const haystack = `${faq.category} ${faq.question} ${faq.answer}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [activeRole, query]);

  const backPath = currentUser ? ROLE_HOME[currentUser.role] : '/login';
  const backLabel = currentUser ? 'Back to Dashboard' : 'Back to Login';

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                <HelpCircle className="h-3.5 w-3.5" />
                Frequently Asked Questions Center
              </p>
              <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">System Questions and Answers</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
                {currentUser
                  ? `Showing questions and answers for ${FAQ_ROLE_LABELS[currentUser.role]} role only.`
                  : 'Choose a role tab to browse complete role-specific questions and answers before sign-in.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(backPath)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </button>
              <Link
                to="/legal"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Legal Center
              </Link>
            </div>
          </div>

          {!currentUser && (
            <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
              {rolesInView.map((role) => {
                const active = role === activeRole;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {FAQ_ROLE_LABELS[role]}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <label className="relative block w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions, answers, or categories"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="text-xs font-medium text-slate-500">
              Showing {filteredFaqs.length} of {ROLE_FAQS[activeRole].length} questions and answers for {FAQ_ROLE_LABELS[activeRole]}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredFaqs.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No matching question found for this role. Try a broader keyword.
              </div>
            )}

            {filteredFaqs.map((faq, index) => (
              <details
                key={`${activeRole}-${index}-${faq.question}`}
                className="group rounded-xl border border-slate-200 bg-white p-0"
              >
                <summary className="cursor-pointer list-none px-4 py-3 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{faq.question}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {faq.category}
                    </span>
                  </div>
                </summary>
                <div className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
