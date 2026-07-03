# MFIT Typography Analysis — Complete Font Breakdown

**Analisado:** Login screen + Landing page + HAR code  
**Data:** 2026-07-01  
**Status:** Reference document para replicação AURON

---

## MFIT Font Stack

### Primary Font: **Inter** (Sans-Serif)
- **Source:** Google Fonts (open-source)
- **Weights used:** 400 (regular), 500 (medium), 600 (semibold)
- **Used for:** All body text, inputs, buttons, labels, links
- **Fallback:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`

### Display Font: **Hartwell Alt** (Geometric Sans-Serif)
- **Source:** Sudtipos (premium/paid font)
- **Weights used:** Semibold, Bold
- **Styles:** Normal (landing page uses italic variants: Semibold Italic, Bold Italic, Thin Italic)
- **Used for:** Logo, main headings
- **License:** Commercial license required

### Secondary Font: **Montserrat** (Geometric Sans-Serif)
- **Source:** Google Fonts (open-source)
- **Weights used:** 500 (medium), 600 (semibold)
- **Used for:** Occasional accent headings (landing page)
- **Not visible:** Login screen

---

## Login Screen — Element-by-Element

### 1. Logo "MFIT PERSONAL" (with dumbbell icon)
```
Font:           Hartwell Alt
Weight:         Semibold ou Bold (600-700)
Size:           24px-28px
Style:          Normal (não italic)
Color:          #0d1f2d (dark navy/charcoal)
Letter-spacing: 0px (automatic kerning)
Line-height:    1
```
**Visual:** Geometric, clean, premium look. Icon + text side-by-side.

---

### 2. "Client" Label (below logo)
```
Font:       Inter
Weight:     600 (semibold)
Size:       14px-16px
Color:      #0070c4 (MFIT blue accent)
Style:      Normal
```
**Visual:** Small, colored label indicating account type.

---

### 3. Email Input (field + placeholder)
```
Font:           Inter
Weight:         400 (regular)
Placeholder:    #bdbdbd (light gray)
Text (filled):  #333333 (dark gray)
Size:           14px
Style:          Normal
```
**Input styling:**
- Background: white (#ffffff)
- Border: 1px solid #e0e0e0 (light gray)
- Border-radius: 4px-6px
- Padding: 12px 16px
- Height: 44px-48px (touch-friendly)

---

### 4. Password Input (field + placeholder + eye icon)
```
Font:           Inter
Weight:         400
Placeholder:    #bdbdbd
Text (filled):  #333333
Size:           14px
Style:          Normal
Eye icon:       SVG, 16px, #bdbdbd
```
**Same styling as Email input + eye visibility toggle.**

---

### 5. "Forgot password? Click here" Link
```
Text color:     #333333 (dark gray)
Link color:     #0070c4 (blue)
Font:           Inter
Weight:         500-600
Size:           13px-14px
Style:          Normal
Underline:      Only on hover
```
**Visual:** "Click here" portion is underlined and clickable.

---

### 6. "Sign in" Primary Button
```
Font:           Inter
Weight:         600 (semibold)
Size:           16px
Color:          white (#ffffff)
Background:     #0070c4 (MFIT blue)
Border:         none
Border-radius:  4px
Padding:        12px-14px (vertical) × 24px-32px (horizontal)
Height:         48px-52px
Cursor:         pointer
```
**States:**
- Normal: #0070c4
- Hover: #0056a3 (darker blue)
- Active: even darker or subtle shadow
- Disabled: opacity 0.5, cursor not-allowed

**Width:** 100% of form container (responsive).

---

### 7. "I don't have an account" Secondary Button/Link
```
Font:           Inter
Weight:         500-600
Size:           14px
Color:          #0070c4 (blue text)
Background:     transparent ou white
Border:         1px solid #0070c4 (blue)
Border-radius:  4px
Padding:        12px × 24px
Height:         48px
Cursor:         pointer
```
**States:**
- Normal: transparent background, blue border + text
- Hover: light blue background (#e6f2ff or similar)
- Active: slightly darker background

**Width:** 100% of form container.

---

### 8. "Terms of Service" Footer Link
```
Font:           Inter
Weight:         400 (regular)
Size:           12px
Color:          #333333 (dark gray)
Style:          Normal
Underline:      On hover
Cursor:         pointer
```
**Visual:** Centered below buttons, small and neutral.

---

### 9. reCAPTCHA Badge
```
Font:           Google's proprietary
Size:           28px × 77px (standard size)
Color:          light gray (#f9f9f9) background
Position:       bottom-right corner
```
**Note:** Auto-rendered by Google reCAPTCHA v3.

---

## Color Reference (Login Screen)

```
Dark Navy/Text:    #0d1f2d, #333333
Light Gray:        #bdbdbd, #e0e0e0
MFIT Blue:         #0070c4
Blue Dark Hover:   #0056a3
White:             #ffffff
```

---

## CSS Font Stack (implementable)

```css
/* Primary font (all body, inputs, buttons) */
--font-primary: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;

/* Display font (logo, headings) */
--font-display: "Hartwell Alt", "Hartwell", "Poppins", sans-serif;

/* Import in head or CSS */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* For Hartwell Alt (if using paid version) */
@font-face {
  font-family: 'Hartwell Alt';
  src: url('/fonts/hartwell-alt.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'Hartwell Alt';
  src: url('/fonts/hartwell-alt-semibold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
}

@font-face {
  font-family: 'Hartwell Alt';
  src: url('/fonts/hartwell-alt-bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
}

/* Usage */
body {
  font-family: var(--font-primary);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

h1, .logo {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 24px;
}

button {
  font-family: var(--font-primary);
  font-weight: 600;
  font-size: 16px;
}

input, input::placeholder {
  font-family: var(--font-primary);
  font-weight: 400;
  font-size: 14px;
}

a {
  font-family: var(--font-primary);
  font-weight: 500;
  color: #0070c4;
}
```

---

## Comparison: Landing Page vs. Login Screen

| Element | Landing Page | Login Screen |
|---------|--------------|--------------|
| **Logo** | Hartwell Alt (Semibold or Bold) | Hartwell Alt (Semibold) |
| **H1 Headings** | Hartwell Alt (Semibold Italic) | N/A |
| **H2 Headings** | Hartwell Alt (Semibold Italic) | N/A |
| **Body Text** | Inter 400 | Inter 400 |
| **Buttons** | Inter 600 | Inter 600 |
| **Accent Font** | Montserrat 500-600 | None |
| **Italic Usage** | Yes (headings) | No (normal only) |

**Key insight:** Landing uses italic for premium feel. Login keeps it clean/formal.

---

## Open-Source Alternatives to Hartwell Alt

If you want to avoid licensing the premium Hartwell Alt font:

### 1. **Poppins** (Recommended for AURON)
- **Geometry:** Yes (geometric sans)
- **Weights:** Thin to Black (12 weights)
- **Italic:** Yes
- **Feeling:** Friendly, modern, geometric
- **Use:** Logo, headings
- **Source:** Google Fonts (free)
- **CSS:**
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
  ```

### 2. **Fraunces** (Alternative)
- **Geometry:** Yes (bold geometric)
- **Weights:** Thin to Black
- **Italic:** Yes
- **Feeling:** Bold, editorial, premium
- **Use:** Headlines, branding
- **Source:** Google Fonts (free)

### 3. **Montserrat Bold** (Already used by MFIT)
- **Geometry:** Yes
- **Weights:** Thin to Black
- **Italic:** Yes
- **Feeling:** Urban, geometric, friendly
- **Use:** Can replace Hartwell Alt
- **Source:** Google Fonts (free)

### 4. **JetBrains Mono** (Technical alternative)
- **Geometry:** Monospace (different vibe)
- **Use:** AURON already uses for numbers
- **Alternative use:** Could work for tech-forward branding

---

## AURON Typography Recommendation

### Approach A: Premium (with paid font)
```css
--font-primary:   Inter (Google Fonts)
--font-display:   Hartwell Alt (Sudtipos paid) OR similar premium font
--font-accent:    Montserrat (Google Fonts)

Result: Match MFIT closely
```

### Approach B: Open-Source Only (Recommended)
```css
--font-primary:   Inter (Google Fonts)
--font-display:   Poppins SemiBold / Bold (Google Fonts)
--font-accent:    Montserrat (Google Fonts)

Result: Premium feel, zero licensing cost
Fallback: Already uses JetBrains Mono for numbers
```

### Approach C: Minimal (keep current AURON)
```css
--font-primary:   Inter (already in use)
--font-mono:      JetBrains Mono (already in use)
--font-display:   Poppins Bold (add for landing only)

Result: Consistent with app, low overhead
```

**AURON Recommendation:** **Approach B** (Poppins + Inter + Montserrat, all Google Fonts).

---

## Implementation for AURON Login Screen

**Mirror MFIT login but with AURON branding:**

```tsx
// components/LoginForm.tsx

export default function LoginForm() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      
      {/* Logo */}
      <div className="mb-8">
        <h1 className="font-poppins font-bold text-2xl text-dark-navy">
          AURON PERSONAL
        </h1>
        <p className="text-sm font-inter font-semibold text-accent-blue mt-4">
          Coach
        </p>
      </div>

      {/* Form */}
      <form className="w-full max-w-sm">
        
        {/* Email Input */}
        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-3 font-inter font-400 text-14 border border-gray-300 rounded-md mb-4"
        />

        {/* Password Input */}
        <input
          type="password"
          placeholder="Senha"
          className="w-full px-4 py-3 font-inter font-400 text-14 border border-gray-300 rounded-md mb-4"
        />

        {/* Forgot Password */}
        <p className="text-sm font-inter font-500 mb-6">
          Esqueceu a senha? <a href="#" className="text-accent-blue underline">Clique aqui</a>
        </p>

        {/* Sign In Button */}
        <button className="w-full py-3 bg-accent-blue text-white font-inter font-semibold text-16 rounded-md hover:bg-accent-blue-dark mb-4">
          Entrar
        </button>

        {/* Sign Up Button */}
        <button className="w-full py-3 border border-accent-blue text-accent-blue font-inter font-500 text-14 rounded-md hover:bg-blue-50">
          Não tenho uma conta
        </button>
      </form>

      {/* Footer */}
      <p className="text-xs font-inter font-400 text-gray-700 mt-8">
        Termos de Serviço
      </p>
    </div>
  );
}
```

**Tailwind config for fonts:**

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['18px', '28px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
      },
      colors: {
        'dark-navy': '#0d1f2d',
        'accent-blue': '#2563EB', // AURON blue (lighter than MFIT #0070c4)
        'accent-blue-dark': '#1D4ED8',
      },
    },
  },
};
```

---

## Quick Reference Cheat Sheet

| Element | Font | Weight | Size | Color |
|---------|------|--------|------|-------|
| **Logo** | Poppins | 700 (Bold) | 24px | #0d1f2d |
| **Label** | Inter | 600 | 14px | #2563EB |
| **Input text** | Inter | 400 | 14px | #333333 |
| **Input placeholder** | Inter | 400 | 14px | #bdbdbd |
| **Link** | Inter | 500 | 14px | #2563EB (hover: underline) |
| **Primary button** | Inter | 600 | 16px | white on #2563EB |
| **Secondary button** | Inter | 600 | 14px | #2563EB on transparent |
| **Footer text** | Inter | 400 | 12px | #333333 |

---

## Font Files to Import

```html
<!-- In HTML <head> or Next.js layout -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;600;700&family=Montserrat:wght@500;600&display=swap" rel="stylesheet">
```

---

## Performance Note

- **Google Fonts loaded:** 3 families (Inter, Poppins, Montserrat)
- **Total weight:** ~50KB (gzipped: ~15KB)
- **Recommended:** Load only weights needed (400, 500, 600, 700)
- **Optimization:** Use `font-display: swap` for better CLS

---

**Version:** 1.0  
**Last Updated:** 2026-07-01  
**Status:** Ready for Implementation
