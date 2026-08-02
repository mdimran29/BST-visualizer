# BST Visualizer UI Design

_Started 2026-07-31 19:37 UTC_

---

## User

Design a modern, professional, interactive Binary Search Tree (BST) Visualizer web application.

The design should feel like a premium developer tool, inspired by Linear, Vercel, Figma, and Raycast. Keep it minimal, elegant, and highly usable.

Theme:
- Dark mode by default
- Clean typography (Inter)
- Rounded cards
- Smooth animations
- Glassmorphism only subtly
- Spacious layout
- Professional color palette

Primary Colors:
Background: #0F172A
Surface: #1E293B
Primary: #3B82F6
Success: #22C55E
Warning: #F59E0B
Danger: #EF4444
Text: White / Light Gray

------------------------------------------------

Layout

Top Navigation Bar
- Logo
- "BST Visualizer"
- Theme Toggle
- GitHub icon
- Reset button

------------------------------------------------

Main Layout

Left Sidebar (Control Panel)

Card title:
"Controls"

Input field
"Enter Value"

Buttons

Insert
Delete
Search
Random Tree
Clear Tree

Divider

Traversal Section

Buttons

Inorder
Preorder
Postorder
Level Order

Divider

Animation Controls

Speed Slider

Slow
Normal
Fast

Play
Pause
Reset Animation

------------------------------------------------

Center Workspace

Large visualization canvas

Display Binary Search Tree using connected circular nodes.

Requirements

- Responsive SVG area
- Tree always centered
- Parent-child edges
- Animated transitions
- Active node highlighted blue
- Found node green
- Deleted node red
- Traversed nodes orange
- Hover effects
- Smooth zoom and pan support

Empty state

Large tree illustration

Text

"Start by inserting a value"

------------------------------------------------

Right Sidebar

Information Panel

Current Operation

Insert
Delete
Search
Traversal

Node Count

Tree Height

Root Node

Leaf Nodes

Maximum Depth

Animation Status

------------------------------------------------

Bottom Panel

Console / Algorithm Steps

Shows execution logs like

Insert(30)

30 becomes root

Insert(20)

20 < 30

Move Left

Node inserted

Search(50)

Compare with 30

Move Right

Found

Each step appears one by one during animation.

------------------------------------------------

Floating Controls

Speed indicator

Current FPS

Zoom +

Zoom -

Fit Tree

------------------------------------------------

Animations

Node grows while inserting

Node fades while deleting

Traversal highlights each node sequentially

Edges animate while connecting

Buttons have subtle hover animations

Cards fade in

Page loads with smooth transitions

------------------------------------------------

Responsive

Desktop:
Three-column layout

Tablet:
Sidebar collapses

Mobile:
Bottom sheet controls

------------------------------------------------

Style

Modern developer tooling aesthetic

Lots of whitespace

Rounded corners (16px)

Soft shadows

Minimal icons

No gradients except tiny accents

Professional UI suitable for portfolio and technical interviews.

Design should look like a polished SaaS product rather than an educational website.

Produce a complete high-fidelity UI with all screens and interaction states.

## Assistant

_[tool: dc_write]_

_[tool: ready_for_verification]_

Built a full interactive BST Visualizer DC: top nav (theme toggle, GitHub, reset), left control panel (insert/delete/search/random/clear, traversal buttons, speed slider, play/pause/reset), center canvas with animated SVG tree (pan/zoom/drag, legend, empty state), right info panel (live stats + status badges), and a bottom console that streams algorithm steps one at a time during animations. Seeded with a sample tree on load; light/dark theming and responsive collapse (tablet sheet, mobile bottom sheet) included. Awaiting verifier feedback.

## User

Found issues — fixing…

## User

Found issues — fixing…

## User

can you imporve the design more

## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

