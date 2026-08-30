AU# AURON — Signup/Cadastro: Arquitetura de Rotas & Fluxo

**Análise:** MFIT signup screen + AURON landing page flow  
**Data:** 2026-07-01  
**Status:** Architecture ready for implementation

---

## 0. Current State

```
Current AURON URLs:
├── / (landing page — a implementar)
├── /login (coach + student tabs)
├── /aluno/* (student app)
├── /coach/* (coach app)
└── /dashboard (after login)

Missing:
├── /signup (signup form)
├── /signup/coach (coach-specific flow)
├── /signup/student (student-specific flow)
├── /onboarding/* (post-signup setup)
└── /verify-email (email confirmation)
```

---

## 1. Proposed Route Architecture

### Root-level routing:

```
/
├── (landing)
│   └── page.tsx                    # landing page (public)
│
├── auth
│   ├── login
│   │   └── page.tsx                # login (coach + student tabs)
│   │
│   ├── signup
│   │   ├── page.tsx                # signup selector (coach vs student)
│   │   ├── coach
│   │   │   └── page.tsx            # coach signup form
│   │   └── student
│   │       └── page.tsx            # student signup form
│   │
│   ├── verify-email
│   │   └── [token]
│   │       └── page.tsx            # email verification (sent link)
│   │
│   ├── reset-password
│   │   └── [token]
│   │       └── page.tsx            # password reset form
│   │
│   └── layout.tsx                  # auth layout (centered form)
│
├── onboarding
│   ├── page.tsx                    # onboarding start
│   ├── [step]
│   │   └── page.tsx                # step-based onboarding (1, 2, 3...)
│   └── complete
│       └── page.tsx                # completion screen
│
├── coach
│   └── ...                         # protected routes
│
├── aluno
│   └── ...                         # protected routes
│
└── api
    ├── auth
    │   ├── signup
    │   │   └── route.ts            # POST /api/auth/signup
    │   ├── login
    │   │   └── route.ts            # POST /api/auth/login
    │   ├── verify-email
    │   │   └── route.ts            # POST /api/auth/verify-email
    │   └── refresh
    │       └── route.ts            # POST /api/auth/refresh
    │
    └── onboarding
        └── route.ts                # POST /api/onboarding
```

---

## 2. User Flow: Signup Journey

### Flow 1: Landing Page → Signup (New user)

```
┌──────────────────────────────────────────────┐
│ Landing Page: "Comece Agora Grátis"          │
│ [Blue CTA Button]                            │
└──────────┬───────────────────────────────────┘
           │ Click
           ▼
┌──────────────────────────────────────────────┐
│ /signup — Account Type Selector              │
│ "Você é Coach ou Aluno?"                     │
│ [Coach Card] [Student Card]                  │
└──────────┬──────────────────────────────────┘
           │ Choose
           ▼
┌──────────────────────────────────────────────┐
│ /signup/coach (ou /signup/student)           │
│ Signup Form (email, password, details)       │
│ [Sign Up Button]                             │
└──────────┬──────────────────────────────────┘
           │ Submit
           ▼
┌──────────────────────────────────────────────┐
│ Verify Email (backend sends link)            │
│ /verify-email/[token] (via email link)       │
│ "Email confirmado! 🎉"                       │
└──────────┬──────────────────────────────────┘
           │ Link clicked
           ▼
┌──────────────────────────────────────────────┐
│ /onboarding — Setup Wizard                   │
│ Step 1: Profile info                         │
│ Step 2: Preferences                          │
│ Step 3: First action                         │
└──────────┬──────────────────────────────────┘
           │ Complete all steps
           ▼
┌──────────────────────────────────────────────┐
│ /coach/dashboard (ou /aluno/meu-treino)      │
│ User logged in + onboarded                   │
└──────────────────────────────────────────────┘
```

### Flow 2: Login Page → Signup (No account)

```
┌──────────────────────────────────────────────┐
│ /login — Coach Tab (active)                  │
│ [Email] [Password]                           │
│ [Entrar como Coach]                          │
│ "Não tenho uma conta" ← [Secondary CTA]      │
└──────────┬──────────────────────────────────┘
           │ Click "Não tenho..."
           ▼
┌──────────────────────────────────────────────┐
│ /signup (or /signup/coach directly)          │
│ Coach Signup Form                            │
│ (already knows user wants "Coach")           │
└──────────┬──────────────────────────────────┘
           │ Rest same as Flow 1
           ▼
```

### Flow 3: Deep Link (Invitation URL)

```
/signup?type=coach&invited_by=UUID
├─ Prefill some fields (if shared data)
├─ Show "Invited by [Coach Name]"
└─ Same signup flow
```

---

## 3. Route Details & Page Specs

### 3.1 /signup (Account Type Selector)

```
┌────────────────────────────────────┐
│ AURON Logo                          │
├────────────────────────────────────┤
│                                    │
│ Você é Coach ou Aluno?             │
│ Escolha para começar               │
│                                    │
│ ┌──────────┐  ┌──────────┐        │
│ │ 🎯       │  │ 💪       │        │
│ │ COACH    │  │ ALUNO    │        │
│ │ Prescrever│ │ Treinar │        │
│ │ treinos  │  │ com foco │        │
│ │ [Arrow→] │  │ [Arrow→] │        │
│ └──────────┘  └──────────┘        │
│                                    │
│ Já tem conta? [Login →]            │
│                                    │
└────────────────────────────────────┘
```

**Implementation:**
```tsx
// /app/auth/signup/page.tsx
export default function SignupTypeSelector() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-4xl font-bold">
        Você é Coach ou Aluno?
      </h1>
      <p className="text-lg text-text-secondary">
        Escolha seu tipo de conta para começar
      </p>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Coach Card */}
        <Link href="/auth/signup/coach">
          <div className="p-8 border-2 border-border-default rounded-lg
                          hover:border-accent hover:bg-accent/5
                          transition-all cursor-pointer group">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold mb-2">Coach</h2>
            <p className="text-sm text-text-secondary mb-6">
              Prescrever treinos, gerenciar alunos e acompanhar progresso
            </p>
            <div className="flex items-center gap-2 text-accent">
              <span>Começar →</span>
            </div>
          </div>
        </Link>
        
        {/* Student Card */}
        <Link href="/auth/signup/student">
          <div className="p-8 border-2 border-border-default rounded-lg
                          hover:border-accent hover:bg-accent/5
                          transition-all cursor-pointer group">
            <div className="text-4xl mb-4">💪</div>
            <h2 className="text-2xl font-bold mb-2">Aluno</h2>
            <p className="text-sm text-text-secondary mb-6">
              Treinar com foco, acompanhar progresso e alcançar objetivos
            </p>
            <div className="flex items-center gap-2 text-accent">
              <span>Começar →</span>
            </div>
          </div>
        </Link>
      </div>
      
      <p className="text-center text-text-secondary">
        Já tem conta? <Link href="/auth/login" className="text-accent font-600">Fazer Login</Link>
      </p>
    </div>
  );
}
```

---

### 3.2 /auth/signup/coach (Coach Signup Form)

**Based on MFIT + AURON customization:**

```
┌────────────────────────────────────┐
│ AURON Logo                          │
│ ← Go Back                           │
├────────────────────────────────────┤
│                                    │
│ Criar conta — Coach                │
│                                    │
│ Nome Completo                      │
│ [Full Name Input]                  │
│                                    │
│ E-mail                             │
│ [Email Input]                      │
│                                    │
│ Confirmar E-mail                   │
│ [Email Confirm Input]              │
│                                    │
│ Senha                              │
│ [Password Input]  [👁️ toggle]      │
│ Força: Média [●●●○○]              │
│                                    │
│ Telefone                           │
│ [🇧🇷 +55] [Phone Input]            │
│                                    │
│ CREF (opcional)                    │
│ [CREF Input]                       │
│                                    │
│ Especialidade                      │
│ [Dropdown: Musculação, CrossFit...]│
│                                    │
│ ☐ Aceito os Termos de Uso          │
│                                    │
│ [Criar Conta]                      │
│                                    │
│ Já tem conta? [Login →]            │
│                                    │
└────────────────────────────────────┘
```

**Implementation:**
```tsx
// /app/auth/signup/coach/page.tsx
export default function CoachSignup() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    email_confirm: '',
    password: '',
    phone: '',
    cref: '',
    specialty: '',
    terms_accepted: false,
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          account_type: 'coach',
        }),
      });
      
      if (!res.ok) {
        const { errors } = await res.json();
        setErrors(errors);
        return;
      }
      
      // Redirect to verify-email screen
      router.push('/auth/verify-email?email=' + formData.email);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Full Name */}
      <FormField
        label="Nome Completo"
        type="text"
        value={formData.full_name}
        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
        error={errors.full_name}
        required
      />
      
      {/* Email */}
      <FormField
        label="E-mail"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        error={errors.email}
        required
      />
      
      {/* Email Confirm */}
      <FormField
        label="Confirmar E-mail"
        type="email"
        value={formData.email_confirm}
        onChange={(e) => setFormData({...formData, email_confirm: e.target.value})}
        error={errors.email_confirm}
        required
      />
      
      {/* Password with strength meter */}
      <PasswordField
        label="Senha"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        error={errors.password}
        showStrength
        required
      />
      
      {/* Phone */}
      <PhoneField
        label="Telefone"
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
        error={errors.phone}
        required
      />
      
      {/* CREF (optional) */}
      <FormField
        label="CREF (opcional)"
        type="text"
        value={formData.cref}
        onChange={(e) => setFormData({...formData, cref: e.target.value})}
        error={errors.cref}
        hint="Número do seu registro profissional"
      />
      
      {/* Specialty */}
      <SelectField
        label="Especialidade"
        value={formData.specialty}
        onChange={(e) => setFormData({...formData, specialty: e.target.value})}
        options={[
          { value: 'musculacao', label: 'Musculação' },
          { value: 'crossfit', label: 'CrossFit' },
          { value: 'hiit', label: 'HIIT' },
          { value: 'pilates', label: 'Pilates' },
          { value: 'functional', label: 'Treinamento Funcional' },
          { value: 'outro', label: 'Outro' },
        ]}
        error={errors.specialty}
      />
      
      {/* Terms */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="terms"
          checked={formData.terms_accepted}
          onChange={(e) => setFormData({...formData, terms_accepted: e.target.checked})}
          className="mt-1"
        />
        <label htmlFor="terms" className="text-sm text-text-secondary">
          Aceito os <Link href="/terms" className="text-accent underline">Termos de Uso</Link> e
          <Link href="/privacy" className="text-accent underline">Política de Privacidade</Link>
        </label>
      </div>
      
      {/* reCAPTCHA (if needed) */}
      <ReCAPTCHA sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY} />
      
      {/* Submit */}
      <button
        type="submit"
        disabled={!formData.terms_accepted || loading}
        className="w-full py-3 bg-accent hover:bg-accent-hover
                   text-white font-600 rounded-lg
                   disabled:opacity-70 transition-all"
      >
        {loading ? 'Criando conta...' : 'Criar Conta'}
      </button>
      
      {/* Footer link */}
      <p className="text-center text-sm text-text-secondary">
        Já tem conta? <Link href="/auth/login" className="text-accent font-600">Fazer Login</Link>
      </p>
    </form>
  );
}
```

---

### 3.3 /auth/signup/student (Student Signup Form)

**Simplified compared to coach:**

```
┌────────────────────────────────────┐
│ AURON Logo                          │
│ ← Go Back                           │
├────────────────────────────────────┤
│                                    │
│ Criar conta — Aluno                │
│                                    │
│ Nome Completo                      │
│ [Full Name Input]                  │
│                                    │
│ E-mail                             │
│ [Email Input]                      │
│                                    │
│ Confirmar E-mail                   │
│ [Email Confirm Input]              │
│                                    │
│ Senha                              │
│ [Password Input]  [👁️ toggle]      │
│ Força: Média [●●●○○]              │
│                                    │
│ Objetivo                           │
│ [Dropdown: Perder peso, Ganhar     │
│  músculo, Condicionamento...]      │
│                                    │
│ ☐ Aceito os Termos de Uso          │
│                                    │
│ [Criar Conta]                      │
│                                    │
│ Já tem conta? [Login →]            │
│                                    │
└────────────────────────────────────┘
```

**Key differences from Coach:**
- No CREF field (not relevant)
- No Specialty field (coach defines)
- Add "Goal/Objective" dropdown (Perder peso, Ganhar músculo, etc)
- Simpler overall (less info needed upfront)

---

### 3.4 /auth/verify-email (Email Confirmation)

```
┌────────────────────────────────────┐
│ AURON Logo                          │
├────────────────────────────────────┤
│                                    │
│ 📧 Verifique seu E-mail             │
│                                    │
│ Enviamos um link de confirmação    │
│ para seu@email.com                  │
│                                    │
│ Clique no link no email para       │
│ confirmar sua conta                │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ [Link recebido?]               │ │
│ │ Já confirmou? [Ir para Login]  │ │
│ └────────────────────────────────┘ │
│                                    │
│ Não recebeu o email?               │
│ [Reenviar →]                       │
│                                    │
│ Errou o email? [Voltar]            │
│                                    │
└────────────────────────────────────┘
```

**Auto-redirect on token verification:**
```tsx
// /app/auth/verify-email/[token]/page.tsx
export default async function VerifyEmail({ params }) {
  const { token } = params;
  
  try {
    // Verify token backend
    const res = await fetch(`${API_URL}/api/auth/verify-email`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    if (res.ok) {
      // Auto-redirect to onboarding
      redirect('/onboarding?email=' + email);
    } else {
      return <VerifyEmailError />;
    }
  } catch (error) {
    return <VerifyEmailError error={error.message} />;
  }
}
```

---

### 3.5 /onboarding (Multi-step Setup)

**Coach onboarding:**
```
Step 1: Bio Setup
├─ Profile photo upload
├─ Bio/about text
├─ Specialties selection
└─ [Next]

Step 2: Pricing & Plans
├─ Monthly rate
├─ Package options
├─ Trial offer config
└─ [Next]

Step 3: First Client
├─ Create first student client
├─ Quick setup
├─ [Finish]
└─ → /coach/dashboard

Step 4: Completion
├─ "Welcome, Coach!"
├─ Quick tips
├─ "Start managing your first client"
└─ [Go to Dashboard]
```

**Student onboarding:**
```
Step 1: Goals
├─ Primary goal selector
├─ Secondary goals (multi-select)
└─ [Next]

Step 2: Experience Level
├─ Beginner / Intermediate / Advanced
├─ Injuries/limitations
└─ [Next]

Step 3: Find Coach
├─ Search available coaches
├─ Or use invitation link
└─ [Next]

Step 4: Completion
├─ "Ready to train!"
├─ "Browse coaches or wait for invitation"
└─ [Go to App]
```

---

## 4. Key Differences: MFIT Signup → AURON Signup

| Field | MFIT | AURON Coach | AURON Student | Note |
|-------|------|-------------|---------------|----|
| **Full Name** | ✅ | ✅ | ✅ | Required |
| **Email** | ✅ | ✅ | ✅ | Required |
| **Confirm Email** | ✅ | ✅ | ✅ | Good UX |
| **Password** | ✅ | ✅ | ✅ | With strength |
| **Phone** | ✅ | ✅ | ❌ | Coach-only |
| **Gender** | ✅ | ❌ | ❌ | Not needed |
| **Country** | ✅ (implied) | ❌ | ❌ | Assume Brazil |
| **CREF** | ❌ | ✅ | N/A | Coach-specific |
| **Specialty** | ❌ | ✅ | ❌ | Coach-specific |
| **Goal** | ❌ | N/A | ✅ | Student-specific |
| **Terms** | ✅ | ✅ | ✅ | Required |
| **reCAPTCHA** | ✅ | ✅ | ✅ | Prevent bots |

---

## 5. Login Page: Add "Não tenho conta" Link

**Update /login page:**

From current:
```tsx
<p className="text-center text-sm text-text-secondary">
  Precisa de ajuda? [Fale com o suporte]
</p>
```

To:
```tsx
<div className="space-y-4 text-center text-sm">
  {/* Primary CTA for new users */}
  <Link href="/auth/signup" 
        className="block w-full py-3 border-2 border-accent text-accent
                   rounded-lg hover:bg-accent/5 font-600 transition-all">
    Não tenho uma conta
  </Link>
  
  {/* Support link */}
  <p className="text-text-secondary">
    Precisa de ajuda? <Link href="/support" className="text-accent underline">Fale com o suporte</Link>
  </p>
</div>
```

**Or for Coach tab specifically:**
```tsx
{accountType === 'coach' && (
  <Link href="/auth/signup/coach" 
        className="w-full py-3 border-2 border-accent text-accent rounded-lg ...">
    Não sou coach ainda
  </Link>
)}

{accountType === 'student' && (
  <Link href="/auth/signup/student" 
        className="w-full py-3 border-2 border-accent text-accent rounded-lg ...">
    Criar minha conta
  </Link>
)}
```

---

## 6. Implementation Checklist

### Phase 1: Setup & Routing (Week 1)
- [ ] Create folder structure: `/app/auth/signup/*`
- [ ] Create `/app/auth/signup/page.tsx` (type selector)
- [ ] Create `/app/auth/signup/coach/page.tsx` (coach form)
- [ ] Create `/app/auth/signup/student/page.tsx` (student form)
- [ ] Create `/app/auth/verify-email/[token]/page.tsx`
- [ ] Setup Supabase auth tables (users, email_verifications)
- [ ] Create API routes: `/api/auth/signup`, `/api/auth/verify-email`

### Phase 2: Forms & Validation (Week 1-2)
- [ ] Build reusable `FormField`, `PasswordField`, `PhoneField`, `SelectField` components
- [ ] Implement password strength validator
- [ ] Implement email validation (and confirm matching)
- [ ] Implement phone validation (with country selector)
- [ ] Add error handling per field
- [ ] Add loading states

### Phase 3: Backend Logic (Week 2)
- [ ] Signup endpoint: validate → hash password → create user → send verification email
- [ ] Email verification endpoint: validate token → mark email as verified → auto-login or redirect to onboarding
- [ ] Rate limiting (max 5 signup attempts per email per day)
- [ ] Duplicate email checking

### Phase 4: Onboarding (Week 2-3)
- [ ] Create `/app/onboarding/*` routes
- [ ] Build step-based UI (progress bar, step navigation)
- [ ] Coach onboarding: photo upload, bio, pricing
- [ ] Student onboarding: goals, find coach
- [ ] Completion + auto-redirect to dashboard

### Phase 5: Polish & Testing (Week 3-4)
- [ ] Update login page: add "Não tenho conta" CTA
- [ ] Mobile responsiveness (all signup forms)
- [ ] reCAPTCHA integration
- [ ] Email deliverability testing
- [ ] User flow testing (end-to-end)
- [ ] A/B test type selector copy

---

## 7. Email Flow

### Transactional Emails Needed:

1. **Signup Confirmation**
   ```
   Subject: Bem-vindo(a) ao AURON! Confirme seu email
   Body:
   - Greeting with name
   - Confirmation link (expires 24h)
   - "Or copy this link: [link]"
   - Support contact
   ```

2. **Password Reset**
   ```
   Subject: Redefina sua senha no AURON
   Body:
   - Reset link (expires 1h)
   - "If you didn't request this, ignore this email"
   ```

3. **Email Changed**
   ```
   Subject: Seu email foi alterado
   Body:
   - Confirmation of change
   - Action taken time/date
   - Revert link if needed
   ```

---

## 8. Security Considerations

```
Email verification:
├─ Token format: JWT or UUID + hash
├─ Expiration: 24 hours
├─ Single-use: yes
└─ Re-send limit: 3 per hour

Password requirements:
├─ Minimum: 8 characters
├─ Must contain: uppercase, lowercase, number, special char
├─ Cannot be: common passwords (123456, password, etc)
└─ Strength meter: visual feedback

Rate limiting:
├─ Signup: 5 attempts per email per day
├─ Verify email: 3 re-sends per hour
├─ Login: 5 failed attempts → 15 min lockout
└─ API: 100 req/min per IP

Data privacy:
├─ GDPR compliant (consent checkbox)
├─ Terms & Privacy links mandatory
├─ Delete account option
└─ Data export option (GDPR/LGPD)
```

---

## 9. Signup Conversion Funnel Metrics

Track these metrics post-launch:

```
Landing → Signup selector: __ % (goal: 20%+)
Selector → Coach form: __ % (goal: 15%+)
Selector → Student form: __ % (goal: 25%+)
Form start → Form complete: __ % (goal: 60%+)
Email sent → Email verified: __ % (goal: 70%+)
Onboarding start → Onboarding complete: __ % (goal: 80%+)
Total funnel: Landing → Active user: __ % (goal: 5%+)
```

---

## 10. Recommended Timeline

| Week | Deliverable | Owner |
|------|-------------|-------|
| 1 | Routes, UI components, backend setup | FE + BE |
| 2 | Form logic, validation, email setup | FE + BE |
| 3 | Onboarding, integration testing | FE + BE |
| 4 | Polish, mobile, user testing | FE + QA |

**Total: 4 weeks for 2 devs (1 FE, 1 BE)**

---

## 11. File Structure Reference

```
/app
  /auth
    layout.tsx                       # Centered form layout
    /signup
      page.tsx                       # Type selector
      /coach
        page.tsx                     # Coach form
      /student
        page.tsx                     # Student form
    /verify-email
      /[token]
        page.tsx                     # Verification handler

/api/auth
  /signup
    route.ts                         # POST endpoint
  /verify-email
    route.ts                         # POST endpoint
  /resend-verification-email
    route.ts                         # POST endpoint

/components/auth
  FormField.tsx
  PasswordField.tsx
  PhoneField.tsx
  SelectField.tsx
  SignupTypeSelector.tsx
  CoachSignupForm.tsx
  StudentSignupForm.tsx
  VerifyEmailUI.tsx

/hooks
  useSignupForm.ts                   # Form state
  usePasswordStrength.ts
  usePhoneInput.ts

/lib/auth
  validators.ts                      # Email, password, phone validation
  email.ts                           # Email sending functions
  tokens.ts                          # JWT/verification token generation
```

---

**Document Version:** 1.0  
**Status:** Ready for Implementation  
**Priority:** High (critical user journey)
