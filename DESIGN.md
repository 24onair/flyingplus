# XC Planner UI Guide

## Core Direction

This product uses a bright, quiet, utility-first interface.

- Backgrounds are light, not dark
- Borders are thin and light gray
- Accent color is a soft blue used mainly for primary actions and status
- Surfaces are flat and clean, with almost no dramatic shadow
- Corners are small and restrained
- Typography is simple, readable, and neutral

The feeling should be closer to a calm admin tool or dashboard than a dramatic marketing site.

## Visual Principles

1. Light canvas first  
   The page background should stay near off-white or very light gray.

2. Blue is supportive, not loud  
   Use blue for primary buttons, selected states, active pills, and focus outlines.

3. Gray structure  
   Use pale gray borders and muted labels to organize the layout.

4. Flat over glossy  
   Avoid neon glow, deep gradients, glass effects, or black hero blocks.

5. Small radius  
   Inputs, buttons, cards, and tables should feel tidy and slightly rounded, not pill-heavy.

## Colors

### Base
- Page background: `#f7f8fa`
- Primary surface: `#ffffff`
- Secondary surface: `#f3f4f6`
- Soft surface: `#f8f9fb`

### Borders
- Main border: `#d9dee7`
- Soft border: `#e5e7eb`
- Strong border: `#c8ced9`

### Text
- Primary text: `#111827`
- Secondary text: `#1f2937`
- Muted text: `#8e95a3`
- Placeholder/meta: `#9aa3b2`

### Accent
- Primary blue: `#4ea3e3`
- Primary blue hover: `#3b95db`
- Blue soft background: `rgba(78, 163, 227, 0.14)`

### Semantic
- Success: `#48a868`
- Warning: `#d99531`
- Danger: `#e4554b`
- Danger soft: `rgba(228, 85, 75, 0.12)`

## Buttons

### Primary
- Blue filled background
- White text
- Thin blue border

### Secondary
- Light gray background
- Dark text
- Light gray border

### Outline
- White background
- Dark text
- Light gray border

### Ghost
- Transparent background
- No strong border
- Dark muted text

### Destructive
- Red filled background
- White text
- Red border

### Shared Rules
- Height: around `44px`
- Radius: `4px`
- Weight: `600`
- No uppercase requirement
- No heavy shadow

## Inputs

- Background: white
- Border: light gray
- Radius: `4px`
- Label above input
- Label uses small uppercase or small semibold muted text
- Focus uses blue border or soft blue ring

## Cards and Panels

- Background: white or very light gray
- Border: thin light gray
- Radius: `4px`
- Shadow: minimal, subtle only
- Spacing: generous but not oversized

## Tables

- White rows
- Light gray separators
- Muted uppercase column labels
- Status pills can use blue/gray backgrounds

## Header

- Light background
- Thin bottom border
- Brand on the left
- Navigation items compact and clean
- Active item uses soft blue fill or blue border

## Do Not Use

- Full black sections as default page treatment
- Neon accent borders
- Large glowing shadows
- Big rounded pills everywhere
- Marketing-style dramatic gradients
- Bright accent as a large surface fill unless it is a very soft tint

## Implementation Priority

When updating screens, apply the style in this order:

1. Page background and surface colors
2. Buttons and inputs
3. Borders and corner radius
4. Header and navigation
5. Cards, tables, and status chips
6. Typography cleanup

If there is ambiguity, prefer the attached light reference style over any previous dark theme decisions.
