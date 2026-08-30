# AURON Landing Page — Visual Spec & Implementation Guide

**Baseado em:** Análise visual do MFIT + contexto AURON  
**Data:** 2026-07-01  
**Status:** Ready for development  
**Design System:** AURON Dark Premium + Tailwind CSS

---

## 0. Overview Visual Sections

```
1. NAVBAR + HERO SECTION    (Gradient dark blue + phone mockups)
2. FEATURES SECTION         (Two-column: Coach vs. Aluno)
3. FEATURES GRID            (2x3 grid de cards com ícones/fotos)
4. TESTIMONIALS             (Avatar cards + foto central + social proof)
5. VIDEO/CTA SECTION        (Video embed + decorative lines)
6. FOOTER                   (Dark navy + links + social + download buttons)
```

---

## 1. COLOR PALETTE FINAL (AURON Adapted)

### Primary Colors:
```css
/* AURON Dark Theme for Landing */
--bg-hero:       #1a2847        /* Dark navy-blue (similar MFIT #253850 but AURON-adjusted) */
--bg-feature:    #0f1a2e        /* Darker for contrast */
--accent-blue:   #2563EB        /* AURON primary (keep) */
--accent-blue-light: #3B82F6    /* Lighter hover state */
--accent-green:  #10B981        /* Replace MFIT cyan — more premium */
--accent-line:   #34D399        /* Decorative lines (lighter green) */

/* Text */
--text-primary:  #FFFFFF        /* White on dark backgrounds */
--text-secondary: #E5E7EB       /* Light gray for secondary text */
--text-muted:    #9CA3AF        /* Muted for meta/support text */

/* Cards */
--card-bg:       #1e2d42        /* Slightly lighter than hero for card contrast */
--card-border:   #2d3f52        /* Subtle border */
```

### Gradients:
```css
/* Hero gradient (77deg like MFIT, adapted to AURON) */
--gradient-hero: linear-gradient(
  77deg,
  #1a2847 20.89%,
  #2563EB 162.88%
);

/* Decorative line gradient (green) */
--gradient-lines: linear-gradient(
  90deg,
  #34D399 0%,
  #10B981 50%,
  #059669 100%
);
```

---

## 2. SECTION 1: NAVBAR + HERO

### Layout Structure:

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  [Nav Menu]                     [CTA: Entrar]       │  ← Navbar (fixed/sticky)
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Seu treino,                          [Phone 1]  [Phone 2] │
│  seus dados                            mockup      mockup   │
│  em foco.                                                   │
│                                                              │
│  Acompanhamento inteligente de                             │
│  composição corporal e progresso.                          │
│                                                              │
│  [Botão: Comece Agora Grátis]                              │
│  Teste 7 dias sem cartão de crédito                         │
│                                                              │
│  [Decorative lines - right side]                            │
└─────────────────────────────────────────────────────────────┘
```

### Visual Specifications:

**Navbar:**
- Height: 72px (fixed at top)
- Background: `--bg-hero` with slight transparency
- Logo: white, 40px height
- Menu items: white text, Inter 16px, weight 500
- Gap between items: 32px
- CTA button: blue, white text, 14px, padding 10px 24px, radius 6px
- Hover: `--accent-blue-light` with subtle shadow

**Hero Section:**
- Height: 100vh (full viewport)
- Background: `--gradient-hero`
- Grid layout: 2 columns (50% text | 50% phones)
- Padding: 80px 60px (desktop), 40px 20px (mobile)

**Hero Text (LEFT):**
- Heading: 
  - Font: Inter, 72px, weight 700, italic
  - Line-height: 1.1
  - Color: white
  - Margin-bottom: 32px
  - Text: "Seu treino, seus dados em foco."
  
- Subheading:
  - Font: Inter, 20px, weight 400
  - Color: `--text-secondary`
  - Margin-bottom: 48px
  - Text: "Acompanhamento inteligente de composição corporal e progresso."
  
- CTA Button:
  - Text: "Comece Agora Grátis"
  - Background: `--accent-blue`
  - Color: white
  - Padding: 14px 32px
  - Font: Inter 16px, weight 600
  - Border-radius: 8px
  - Hover: background `--accent-blue-light`, shadow 0 8px 16px rgba(37, 99, 235, 0.3)
  - Cursor: pointer
  
- Support text (below button):
  - Font: Inter 13px, weight 400, color `--text-muted`
  - Text: "Teste 7 dias sem cartão de crédito"

**Hero Phones (RIGHT):**
- Display: flex, gap: 32px, justify: center, align: center
- Phone 1 (coach app):
  - Width: 280px (responsive)
  - Height: auto (maintain aspect)
  - Image: screenshot mockup of coach panel
  - Box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3)
  - Border-radius: 20px
  - Slight rotation: transform rotate(-5deg)
  
- Phone 2 (student app):
  - Width: 280px
  - Height: auto
  - Image: screenshot mockup of student app
  - Box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3)
  - Border-radius: 20px
  - Slight rotation: transform rotate(5deg)
  - Z-index higher than phone 1 (overlap effect)

**Decorative Lines (RIGHT edge):**
- Position: absolute, right: -50px, top: 0
- Width: 200px, height: 100%
- SVG pattern: horizontal lines, gradient from green to transparent
- Opacity: 0.15
- Animation: optional subtle scroll-based movement

**Responsiveness:**
- Desktop (1200px+): 2-column grid, hero text large, phones side-by-side
- Tablet (768px-1199px): Text 48px, phones stack vertically
- Mobile (375px-767px): Single column, text 36px, phones full-width

---

## 3. SECTION 2: FEATURES (Coach vs. Student)

### Layout:

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  [Para o Coach]          [Photo: Coach + Student]     [Para o Student]
│  Prescrição de                                        Treinos intuitivos
│  treinos fácil                                        com vídeo
│  e rápida                                             
│  - Feature 1                                          - Feature 1
│  - Feature 2                                          - Feature 2
│  - Feature 3                                          - Feature 3
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Visual Specifications:

**Section Background:**
- Background: `--bg-feature` (gradient optional, subtle)
- Padding: 100px 60px

**Grid Layout:**
- Display: grid
- Grid-template-columns: 1fr 1fr 1fr (text | image | text)
- Gap: 60px
- Max-width: 1400px
- Margin: auto

**Text Columns (LEFT & RIGHT):**
- Width: auto

- Heading:
  - Small label above: "Para o Coach" / "Para o Student"
  - Font: Inter 12px, weight 600, uppercase, letter-spacing 1px
  - Color: `--accent-green`
  - Margin-bottom: 16px
  
- Title:
  - Font: Inter 40px, weight 700
  - Color: white
  - Line-height: 1.2
  - Margin-bottom: 32px
  
- Features list:
  - Font: Inter 16px, weight 400
  - Color: `--text-secondary`
  - Bullet points (custom, not default)
  - Gap between items: 12px

**Center Image:**
- Display: flex, align-center, justify-center
- Image: professional photo (coach + student together)
- Width: 100%
- Max-width: 400px
- Border-radius: 16px
- Box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4)
- Hover: slight zoom effect (transform scale(1.02))

**Responsiveness:**
- Tablet (768px): 2 columns (text left, image+text combined right)
- Mobile: 1 column, stack vertically

---

## 4. SECTION 3: FEATURES GRID (2x3 Cards)

### Layout:

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  [Card 1]      [Card 2]      [Card 3]                   │
│  icon/text     photo         icon/text                  │
│                                                          │
│  [Card 4]      [Card 5]      [Card 6]                   │
│  icon/text     photo         icon/text                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Card Specifications:

**Container:**
- Display: grid
- Grid-template-columns: repeat(3, 1fr)
- Gap: 24px
- Padding: 80px 60px
- Background: `--bg-hero` (solid)
- Max-width: 1400px
- Margin: auto

**Individual Card:**
- Background: `--card-bg`
- Border: 1px solid `--card-border`
- Border-radius: 12px
- Padding: 32px
- Min-height: 280px
- Display: flex, flex-direction: column, justify: space-between
- Transition: all 300ms ease
- Hover:
  - Transform: translateY(-8px)
  - Box-shadow: 0 12px 24px rgba(37, 99, 235, 0.15)
  - Border-color: `--accent-blue`

**Card with Icon (4 cards):**
- Icon: SVG, 48x48px, color `--accent-green`
- Title: Inter 18px, weight 600, color white, margin-top: 20px
- Description: Inter 14px, weight 400, color `--text-secondary`

**Card with Photo (2 cards):**
- Image: full-width, height 180px, object-fit cover
- Overlay gradient (dark at bottom for text visibility)
- Text positioned over image (absolute)
- Title: white, 18px bold
- Box-shadow on image for depth

**Features list (sample):**
1. Medidas & Composição (icon)
2. Progresso em foco (photo)
3. Relatórios PDF (icon)
4. Tudo sincronizado (photo)
5. Notificações inteligentes (icon)
6. Suporte dedicado (icon)

**Responsiveness:**
- Tablet (768px): 2 columns
- Mobile: 1 column

---

## 5. SECTION 4: TESTIMONIALS

### Layout:

```
┌────────────────────────────────────────────────────────────┐
│                                                             │
│                  Veja o que dizem                          │
│            "Ver mais depoimentos" ←───                      │
│                                                             │
│  [Avatar 1]    [Avatar 2]    [Avatar 3]                    │
│  Quote 1       Quote 2       Quote 3                       │
│  Name 1        Name 2        Name 3                        │
│  Role 1        Role 2        Role 3                        │
│                                                             │
│            [Photo: Coach + Student central]                │
│                                                             │
│  "O App que simplifica..."                                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications:

**Section Header:**
- Padding-top: 80px
- Text-align: center
- Heading: "Veja o que dizem sobre o AURON"
  - Font: Inter 44px, weight 700
  - Color: white
  - Margin-bottom: 12px
  
- Link "Ver mais depoimentos":
  - Float right
  - Font: Inter 14px, weight 600
  - Color: `--accent-blue`
  - Text-decoration: underline on hover

**Testimonial Cards (3 cards):**
- Display: grid, 3 columns, gap 32px
- Background: white
- Border-radius: 12px
- Padding: 32px
- Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
- Margin-bottom: 60px

- Avatar:
  - Width/height: 48px
  - Border-radius: 50%
  - Background: `--accent-blue`
  - Margin-bottom: 16px
  
- Quote:
  - Font: Inter 15px, weight 400, italic
  - Color: #1F2937 (dark gray on light card)
  - Line-height: 1.6
  - Margin-bottom: 16px
  - Min-height: 80px
  
- Name:
  - Font: Inter 16px, weight 600
  - Color: #111827
  - Margin-bottom: 4px
  
- Role:
  - Font: Inter 13px, weight 400
  - Color: #6B7280
  - Margin-bottom: 12px

**Center Photo:**
- Display: flex, justify-center
- Margin: 60px 0
- Image: professional photo
- Width: 100%, max-width: 600px
- Border-radius: 16px
- Box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2)

**Quote Section Below Photo:**
- Text-align: center
- Heading: "O App que simplifica a prescrição de treinos"
  - Font: Inter 32px, weight 700, italic
  - Color: `--accent-blue`
  - Margin: 40px 0

**Responsiveness:**
- Tablet: 2 columns
- Mobile: 1 column, cards stack

---

## 6. SECTION 5: VIDEO + CTA

### Layout:

```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  "A MFIT quer movimentar a sua carreira"                │
│  "Otimizamos a sua rotina..."                           │
│                                                           │
│              [Video Player mockup]                        │
│              (Decorative lines left/right)               │
│                                                           │
│  "O App que simplifica..."                               │
│  [Phone mockup left]  [CTA card right]                   │
│                                                           │
│  └─ "Agende uma conversa"                                │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Visual Specifications:

**Header:**
- Heading: "A AURON quer movimentar seus resultados"
  - Font: Inter 48px, weight 700
  - Color: white
  - Text-align: center
  - Margin-bottom: 20px
  
- Subheading: "Otimizamos sua rotina para fidelizar alunos e aumentar faturamento"
  - Font: Inter 20px, weight 400
  - Color: `--text-secondary`
  - Text-align: center
  - Margin-bottom: 60px

**Video Section:**
- Background: `--bg-feature`
- Padding: 60px
- Display: flex, justify-center, align-items: center
- Position: relative

- Video/Iframe:
  - Width: 100%, max-width: 800px
  - Aspect-ratio: 16/9
  - Border-radius: 16px
  - Box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3)
  
- Play button overlay:
  - SVG play icon, 80px size
  - Background: `--accent-blue` with opacity 0.9
  - Border-radius: 50%
  - Centered on video
  - Hover: opacity increases, scale slightly

**Decorative Lines:**
- Left and right of video
- SVG pattern: diagonal or horizontal lines
- Gradient from green to transparent
- Opacity: 0.2
- Width: 150px, height: 100%

**Below Video:**
- Heading: "O app que simplifica a prescrição de treinos"
  - Font: Inter 28px, weight 700
  - Color: white
  - Margin: 60px 0 40px
  
- Layout: 2 columns (phone image | CTA card)
  - Phone mockup (left):
    - Width: 280px
    - Border-radius: 20px
    - Box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3)
  
  - CTA Card (right):
    - Background: `--card-bg`
    - Border: 1px solid `--card-border`
    - Padding: 40px
    - Border-radius: 12px
    - Heading: "Comece sua jornada"
      - Font: Inter 24px, weight 600
      - Color: white
      - Margin-bottom: 16px
    
    - Description:
      - Font: Inter 15px, weight 400
      - Color: `--text-secondary`
      - Margin-bottom: 32px
    
    - Button: "Agendar Conversa"
      - Background: `--accent-blue`
      - Color: white
      - Padding: 14px 32px
      - Border-radius: 8px
      - Hover: `--accent-blue-light`

**Responsiveness:**
- Tablet: stack vertically
- Mobile: single column

---

## 7. SECTION 6: FOOTER

### Layout:

```
┌──────────────────────────────────────────────────────────┐
│ Background: dark navy with green line accent             │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Heading: "Te ajudamos a crescer"                        │
│  Subtext: "Nossa comunidade de coaches..."               │
│                                                           │
│  [Resource Card 1]  [Resource Card 2]  [Resource Card 3]│
│  (Blog/help links)                                       │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  [Social icons]  [Download buttons]                      │
│  [Docs link]     [Contact email]                         │
│                                                           │
├──────────────────────────────────────────────────────────┤
│  AURON © 2026 | Legal | Privacy                          │
└──────────────────────────────────────────────────────────┘
```

### Visual Specifications:

**Background:**
- Background: `--bg-hero`
- Padding: 80px 60px 40px
- Border-top: 3px solid `--accent-green`

**Header:**
- Heading: "Te ajudamos a crescer, personal"
  - Font: Inter 44px, weight 700
  - Color: white
  - Text-align: center
  - Margin-bottom: 16px
  
- Subtext: "Nossa comunidade de coaches oferece recursos para sua carreira"
  - Font: Inter 16px, weight 400
  - Color: `--text-secondary`
  - Text-align: center
  - Margin-bottom: 60px

**Resource Cards (3 columns):**
- Grid layout, gap 32px
- Each card:
  - Background: transparent with hover effect
  - Heading: Inter 16px, weight 600, color white
  - Description: Inter 14px, weight 400, color `--text-muted`
  - Hover: text color becomes `--accent-green`
  - Cursor: pointer

- Sample resources:
  1. Blog: "200 frases de personal trainer"
  2. Guias: "Como estruturar consultoria"
  3. Ajuda: "FAQ e suporte"

**Social & Download Section:**
- Display: flex, justify-between, align-items: center
- Margin: 60px 0
- Border-top: 1px solid `--card-border`
- Border-bottom: 1px solid `--card-border`
- Padding: 40px 0

- Left (Social):
  - Text: "Acompanhe a AURON"
  - Icons: LinkedIn, Instagram, Twitter, YouTube (SVG, 24px)
  - Gap: 16px
  - Hover: color changes to `--accent-green`

- Right (Download):
  - Text: "Baixe o app"
  - Buttons: "Google Play" | "App Store"
  - Style: dark button with white text, 40px height
  - Hover: scale(1.05)

**Legal Footer:**
- Display: flex, justify-space-between, align-items: center
- Font: Inter 12px, weight 400, color `--text-muted`
- Margin-top: 40px

- Left: "AURON © 2026 | Todos os direitos reservados"
- Right: [Privacidade] [Termos] [Contato]

---

## 8. Typography Scale (Tailwind mapping)

```
Hero H1:         72px (9xl)   | Inter 700 italic
Section H2:      48px (4xl)   | Inter 700
Card H3:         24px (2xl)   | Inter 600
Body:            16px (base)  | Inter 400
Small:           14px (sm)    | Inter 400
Tiny:            12px (xs)    | Inter 400 uppercase
```

---

## 9. Spacing Scale (Tailwind)

```
xs:    8px   (1 unit)
sm:    16px  (2 units)
md:    24px  (3 units)
lg:    32px  (4 units)
xl:    48px  (6 units)
2xl:   60px  (7.5 units)
3xl:   80px  (10 units)
```

---

## 10. Animation & Interactions

### Scroll Animations (AOS library):
```javascript
// Hero elements fade-in on load
data-aos="fade-up"
data-aos-duration="800"

// Cards slide up on scroll
data-aos="fade-up"
data-aos-delay="100" (stagger effect)

// Testimonial cards slide from sides
data-aos="fade-left" / "fade-right"
```

### Button Interactions:
```css
/* Primary button */
button:hover {
  background: var(--accent-blue-light);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
  transform: translateY(-2px);
  transition: all 300ms ease;
}

button:active {
  transform: translateY(0);
}

/* Link hover */
a {
  transition: color 200ms ease;
}

a:hover {
  color: var(--accent-green);
}
```

### Hover Effects:
```css
/* Card hover lift */
.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.15);
}

/* Image hover zoom */
.image-container:hover img {
  transform: scale(1.02);
  transition: transform 300ms ease;
}
```

---

## 11. Responsive Breakpoints

```
Mobile:    375px - 639px
Tablet:    640px - 1023px
Desktop:   1024px - 1535px
Wide:      1536px+

/* Tailwind defaults work well */
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

---

## 12. Image Assets Required

```
Hero Section:
- coach-app-mockup.webp (280px width)
- student-app-mockup.webp (280px width)
- phone-decorative-lines.svg

Features Section:
- coach-student-photo.webp (professional photo)

Features Grid:
- icon-measurements.svg
- icon-reports.svg
- icon-sync.svg
- icon-notifications.svg
- photo-feature-1.webp
- photo-feature-2.webp

Testimonials:
- testimonial-photo-center.webp

Video Section:
- video-thumbnail.webp (or video embed)
- decorative-lines-left.svg
- decorative-lines-right.svg

Footer:
- icon-linkedin.svg
- icon-instagram.svg
- icon-twitter.svg
- icon-youtube.svg

General:
- logo-white.svg (navbar)
- logo-full-color.svg (footer if needed)
```

---

## 13. File Structure (Next.js App Router)

```
/app
  /landing
    page.tsx                (main landing page)
    layout.tsx              (layout wrapper)

/components
  /landing
    Navbar.tsx              (fixed header)
    HeroSection.tsx         (hero + phones)
    FeaturesSection.tsx     (coach vs student)
    FeaturesGrid.tsx        (2x3 cards)
    TestimonialsSection.tsx (testimonials + photo)
    VideoSection.tsx        (video + cta)
    Footer.tsx
    
  /common
    Button.tsx              (reusable button)
    Card.tsx                (reusable card)
    Icon.tsx                (SVG wrapper)

/styles
  landing.css              (landing-specific styles or Tailwind)

/public
  /images
    /landing
      (all images organized by section)
  /icons
    (SVG icons)
```

---

## 14. Implementation Checklist

### Phase 1: Structure (Week 1)
- [ ] Create page.tsx and main layout
- [ ] Build Navbar component
- [ ] Build Hero section (text + phone mockups)
- [ ] Setup grid system and responsive breakpoints
- [ ] Import and style all typography

### Phase 2: Content Sections (Week 2)
- [ ] Features section (coach vs student)
- [ ] Features grid (2x3 cards)
- [ ] Testimonials section
- [ ] Video section
- [ ] Footer

### Phase 3: Polish & Animation (Week 2-3)
- [ ] Add AOS scroll animations
- [ ] Button hover states
- [ ] Card hover effects
- [ ] Image lazy loading
- [ ] Responsive testing (all breakpoints)

### Phase 4: Optimization & Testing (Week 3)
- [ ] Image optimization (WebP conversion)
- [ ] Lighthouse audit (90+)
- [ ] Mobile responsiveness (Chrome DevTools)
- [ ] Cross-browser testing
- [ ] Accessibility check (a11y)
- [ ] Performance metrics

### Phase 5: Deployment (Week 4)
- [ ] Final visual QA
- [ ] Analytics setup
- [ ] SEO meta tags
- [ ] Deploy to staging
- [ ] Final UAT with stakeholders
- [ ] Deploy to production

---

## 15. Key Differences MFIT → AURON

| Aspect | MFIT | AURON Landing |
|--------|------|---------------|
| **Colors** | Cyan greens | Green accent (more premium) |
| **Typography** | Hartwell (custom) | Poppins italic (or Inter) |
| **Message** | "Movimente sua carreira" | "Seus dados em foco" |
| **Focus** | Coach features | Coach + Data-driven |
| **Grid Cards** | Generic features | Specific: Medidas, Relatórios, Sync |
| **Hero Visual** | Gradient + phones | Same pattern (maintain familiarity) |

---

## 16. Copy & Messaging Framework

### Hero:
```
Heading:     "Seu treino, seus dados em foco."
Subheading:  "Acompanhamento inteligente de composição corporal e progresso."
CTA:         "Comece Agora Grátis"
Support:     "Teste 7 dias sem cartão de crédito"
```

### Features:
```
Coach:       "Gestão inteligente de alunos com medidas e relatórios"
Student:     "Execução de treinos com feedback de progresso"
```

### Testimonials:
```
Header:      "Veja o que dizem sobre o AURON"
Link:        "Ver mais depoimentos"
```

### Footer:
```
Heading:     "Te ajudamos a crescer, personal"
Resources:   Blog, Guias, Ajuda (specific to AURON)
```

---

## 17. Next Steps for Developer

1. **Setup environment:**
   ```bash
   git clone auron-repo
   cd apps/landing
   npm install
   ```

2. **Create page structure:**
   - Use this spec as source of truth for layout/spacing
   - Reference color tokens from design system
   - Implement responsive with Tailwind breakpoints

3. **Test frequently:**
   - Check at 375px, 768px, 1024px, 1536px
   - Run Lighthouse for performance
   - Test buttons and forms

4. **Reference MFIT but innovate:**
   - Use MFIT as inspiration for structure
   - Apply AURON identity (colors, messaging)
   - Don't copy — adapt

---

**Document Version:** 2.0 (Visual)  
**Status:** Ready for Development  
**Estimated Time:** 40-60 hours (2-3 weeks for 1 FE dev)
