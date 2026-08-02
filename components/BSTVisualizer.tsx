"use client";

import React from "react";
import {
  BSTNode,
  Step,
  AnimationStatus,
  TraversalType,
  HighlightKind,
  insertPlain,
  deleteByValue,
  attachChild,
  countNodes,
  countLeaves,
  heightOf,
  computeLayout,
  getTraversalOrder,
  edgeId,
  PSEUDOCODE,
  PseudocodeLine,
} from "@/lib/bst";
import { Theme, tokensFor } from "@/lib/theme";

interface Props {
  defaultSpeed?: "slow" | "normal" | "fast";
  defaultTheme?: Theme;
  randomTreeSize?: number;
}

interface State {
  tree: BSTNode | null;
  inputValue: string;
  selectInput: string;
  currentOperation: string;
  animationStatus: AnimationStatus;
  pendingSteps: Step[];
  stepIndex: number;
  consoleLogs: string[];
  highlight: Record<string, HighlightKind>;
  edgeHighlight: Record<string, HighlightKind>;
  activeCode: PseudocodeLine[] | null;
  activeCodeLine: number;
  speedIndex: number;
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragStartPanX: number;
  dragStartPanY: number;
  theme: Theme;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeTraversal: TraversalType | null;
}

const SPEED_DELAYS = [1400, 800, 400];

export default class BSTVisualizer extends React.Component<Props, State> {
  fpsRef = React.createRef<HTMLSpanElement>();
  consoleRef = React.createRef<HTMLDivElement>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private raf: number | null = null;

  constructor(props: Props) {
    super(props);
    const speedMap: Record<string, number> = { slow: 0, normal: 1, fast: 2 };
    this.state = {
      tree: null,
      inputValue: "",
      selectInput: "",
      currentOperation: "Idle",
      animationStatus: "idle",
      pendingSteps: [],
      stepIndex: -1,
      consoleLogs: [],
      highlight: {},
      edgeHighlight: {},
      activeCode: null,
      activeCodeLine: -1,
      speedIndex: speedMap[props.defaultSpeed ?? "normal"] ?? 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      dragStartPanX: 0,
      dragStartPanY: 0,
      theme: props.defaultTheme ?? "dark",
      leftSidebarOpen: false,
      rightSidebarOpen: false,
      activeTraversal: null,
    };
  }

  componentDidMount() {
    this.startFps();
    const vals = [50, 30, 70, 20, 40, 60, 80, 10, 25, 65];
    let tree: BSTNode | null = null;
    vals.forEach((v) => {
      tree = insertPlain(tree, v);
    });
    this.setState({
      tree,
      consoleLogs: ["Welcome! Loaded a sample tree — try Insert, Delete, Search or a traversal."],
    });
  }

  componentWillUnmount() {
    this.stopTimer();
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  componentDidUpdate() {
    if (this.consoleRef.current) {
      this.consoleRef.current.scrollTop = this.consoleRef.current.scrollHeight;
    }
  }

  startFps = () => {
    let last = performance.now();
    let frames = 0;
    const loop = (t: number) => {
      frames++;
      if (t - last >= 1000) {
        if (this.fpsRef.current) this.fpsRef.current.textContent = String(Math.round((frames * 1000) / (t - last)));
        frames = 0;
        last = t;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  };

  nodeStyleFor = (id: string) => {
    const key = this.state.highlight[id];
    if (key === "primary") return { fill: "#1E3A5F", stroke: "#3B82F6", text: "#DBEAFE", pulsing: true };
    if (key === "success") return { fill: "#14311F", stroke: "#22C55E", text: "#DCFCE7", pulsing: false };
    if (key === "warning") return { fill: "#3F2A0C", stroke: "#F59E0B", text: "#FEF3C7", pulsing: false };
    if (key === "danger") return { fill: "#3F1616", stroke: "#EF4444", text: "#FEE2E2", pulsing: false };
    return this.state.theme === "dark"
      ? { fill: "#1E293B", stroke: "#334155", text: "#E2E8F0", pulsing: false }
      : { fill: "#F1F5F9", stroke: "#CBD5E1", text: "#0F172A", pulsing: false };
  };

  edgeStyleFor = (id: string) => {
    const key = this.state.edgeHighlight[id];
    if (key === "primary") return { stroke: "#3B82F6", lit: true };
    if (key === "success") return { stroke: "#22C55E", lit: true };
    if (key === "warning") return { stroke: "#F59E0B", lit: true };
    if (key === "danger") return { stroke: "#EF4444", lit: true };
    return { stroke: this.state.theme === "dark" ? "#334155" : "#CBD5E1", lit: false };
  };

  getDelay = () => SPEED_DELAYS[this.state.speedIndex];
  stopTimer = () => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };

  runSteps = (steps: Step[], opLabel: string) => {
    this.stopTimer();
    const codeKey = opLabel.replace(" Traversal", "");
    this.setState(
      {
        currentOperation: opLabel,
        consoleLogs: [],
        highlight: {},
        edgeHighlight: {},
        activeCode: PSEUDOCODE[codeKey] ?? null,
        activeCodeLine: -1,
        pendingSteps: steps,
        stepIndex: -1,
        animationStatus: steps.length ? "playing" : "complete",
      },
      () => {
        if (steps.length) this.playNext();
      }
    );
  };

  playNext = () => {
    const { pendingSteps, stepIndex } = this.state;
    const next = stepIndex + 1;
    if (next >= pendingSteps.length) {
      this.setState({ animationStatus: "complete" });
      return;
    }
    const step = pendingSteps[next];
    this.setState((s) => ({
      stepIndex: next,
      consoleLogs: [...s.consoleLogs, step.log],
      highlight: step.highlight !== undefined ? step.highlight : s.highlight,
      edgeHighlight: step.edgeHighlight !== undefined ? step.edgeHighlight : s.edgeHighlight,
      activeCodeLine: step.codeLine !== undefined ? step.codeLine : s.activeCodeLine,
      tree: step.commit ? step.commit(s.tree) : s.tree,
    }));
    this.timer = setTimeout(() => {
      if (this.state.animationStatus === "playing") this.playNext();
    }, this.getDelay());
  };

  handlePlay = () => {
    if (this.state.animationStatus === "complete" || this.state.pendingSteps.length === 0) return;
    this.setState({ animationStatus: "playing" }, this.playNext);
  };
  handlePause = () => {
    this.stopTimer();
    this.setState({ animationStatus: "paused" });
  };
  handleResetAnimation = () => {
    this.stopTimer();
    this.setState({
      highlight: {},
      edgeHighlight: {},
      activeCode: null,
      activeCodeLine: -1,
      consoleLogs: [],
      animationStatus: "idle",
      pendingSteps: [],
      stepIndex: -1,
      currentOperation: "Idle",
      activeTraversal: null,
    });
  };

  handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ inputValue: e.target.value });
  handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") this.handleInsert();
  };
  parseVal = (): number | null => {
    const v = parseInt(this.state.inputValue, 10);
    return isNaN(v) ? null : v;
  };
  handleSelectInputChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ selectInput: e.target.value });
  handleSelectInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") this.handleSelect();
  };

  handleInsert = () => {
    const v = this.parseVal();
    if (v === null) {
      this.setState({ consoleLogs: ["⚠ Enter a valid numeric value"] });
      return;
    }
    this.runSteps(this.buildInsertSteps(v), "Insert");
    this.setState({ inputValue: "" });
  };

  buildInsertSteps = (val: number): Step[] => {
    const steps: Step[] = [{ log: `Insert(${val})`, highlight: {}, edgeHighlight: {} }];
    const id = "n" + val;
    const pathEdges: Record<string, HighlightKind> = {};
    if (!this.state.tree) {
      steps.push({
        log: `${val} becomes the root node`,
        highlight: { [id]: "success" },
        codeLine: 1,
        commit: () => ({ id, value: val, left: null, right: null }),
      });
      return steps;
    }
    let cur: BSTNode = this.state.tree;
    while (true) {
      steps.push({ log: `Compare ${val} with ${cur.value}`, highlight: { [cur.id]: "primary" }, edgeHighlight: { ...pathEdges } });
      if (val === cur.value) {
        steps.push({ log: `${val} already exists — skipped`, highlight: { [cur.id]: "warning" }, codeLine: 3 });
        return steps;
      }
      if (val < cur.value) {
        if (!cur.left) {
          const pid = cur.id;
          pathEdges[edgeId(pid, id)] = "success";
          steps.push({
            log: `${val} < ${cur.value} → insert as left child`,
            highlight: { [pid]: "primary", [id]: "success" },
            edgeHighlight: { ...pathEdges },
            codeLine: 5,
            commit: (t) => attachChild(t, pid, "left", val),
          });
          return steps;
        }
        pathEdges[edgeId(cur.id, cur.left.id)] = "primary";
        steps.push({
          log: `${val} < ${cur.value} → go left`,
          highlight: { [cur.id]: "primary" },
          edgeHighlight: { ...pathEdges },
          codeLine: 5,
        });
        cur = cur.left;
      } else {
        if (!cur.right) {
          const pid = cur.id;
          pathEdges[edgeId(pid, id)] = "success";
          steps.push({
            log: `${val} > ${cur.value} → insert as right child`,
            highlight: { [pid]: "primary", [id]: "success" },
            edgeHighlight: { ...pathEdges },
            codeLine: 7,
            commit: (t) => attachChild(t, pid, "right", val),
          });
          return steps;
        }
        pathEdges[edgeId(cur.id, cur.right.id)] = "primary";
        steps.push({
          log: `${val} > ${cur.value} → go right`,
          highlight: { [cur.id]: "primary" },
          edgeHighlight: { ...pathEdges },
          codeLine: 7,
        });
        cur = cur.right;
      }
    }
  };

  handleDelete = () => {
    const v = this.parseVal();
    if (v === null) {
      this.setState({ consoleLogs: ["⚠ Enter a valid numeric value"] });
      return;
    }
    this.runSteps(this.buildDeleteSteps(v), "Delete");
    this.setState({ inputValue: "" });
  };

  buildDeleteSteps = (val: number): Step[] => {
    const steps: Step[] = [{ log: `Delete(${val})`, highlight: {}, edgeHighlight: {} }];
    const pathEdges: Record<string, HighlightKind> = {};
    let cur = this.state.tree;
    while (cur) {
      const goLeft = val < cur.value;
      steps.push({
        log: `Compare ${val} with ${cur.value}`,
        highlight: { [cur.id]: "primary" },
        edgeHighlight: { ...pathEdges },
        codeLine: val === cur.value ? undefined : goLeft ? 3 : 5,
      });
      if (val === cur.value) {
        steps.push({
          log: `Found ${val} — removing node`,
          highlight: { [cur.id]: "danger" },
          codeLine: 7,
          commit: (t) => deleteByValue(t, val),
        });
        return steps;
      }
      const next = goLeft ? cur.left : cur.right;
      if (next) pathEdges[edgeId(cur.id, next.id)] = "primary";
      cur = next;
    }
    steps.push({ log: `${val} not found in tree`, highlight: {}, codeLine: 1 });
    return steps;
  };

  handleSearch = () => {
    const v = this.parseVal();
    if (v === null) {
      this.setState({ consoleLogs: ["⚠ Enter a valid numeric value"] });
      return;
    }
    this.runSteps(this.buildSearchSteps(v), "Search");
  };

  buildSearchSteps = (val: number): Step[] => {
    const steps: Step[] = [{ log: `Search(${val})`, highlight: {}, edgeHighlight: {} }];
    let cur = this.state.tree;
    const seen: Record<string, HighlightKind> = {};
    const seenEdges: Record<string, HighlightKind> = {};
    while (cur) {
      const goLeft = val < cur.value;
      seen[cur.id] = "primary";
      steps.push({
        log: `Compare ${val} with ${cur.value}`,
        highlight: { ...seen },
        edgeHighlight: { ...seenEdges },
        codeLine: val === cur.value ? 3 : goLeft ? 5 : 7,
      });
      if (val === cur.value) {
        seen[cur.id] = "success";
        steps.push({ log: `Found ${val}`, highlight: { ...seen }, edgeHighlight: { ...seenEdges }, codeLine: 3 });
        return steps;
      }
      const next = goLeft ? cur.left : cur.right;
      if (next) seenEdges[edgeId(cur.id, next.id)] = "primary";
      cur = next;
    }
    steps.push({ log: `${val} not found`, highlight: { ...seen }, codeLine: 1 });
    return steps;
  };

  handlePredecessor = () => {
    const v = this.parseVal();
    if (v === null) {
      this.setState({ consoleLogs: ["⚠ Enter a valid numeric value"] });
      return;
    }
    this.runSteps(this.buildPredecessorSteps(v), "Predecessor");
  };

  buildPredecessorSteps = (val: number): Step[] => {
    const steps: Step[] = [{ log: `Predecessor(${val})`, highlight: {}, edgeHighlight: {} }];
    let cur = this.state.tree;
    let candidate: BSTNode | null = null;
    const seen: Record<string, HighlightKind> = {};
    const seenEdges: Record<string, HighlightKind> = {};
    while (cur) {
      seen[cur.id] = candidate?.id === cur.id ? "warning" : "primary";
      const goRight = val > cur.value;
      if (goRight) {
        candidate = cur;
        seen[cur.id] = "warning";
      }
      steps.push({
        log: goRight ? `${val} > ${cur.value} → candidate, go right` : `${val} ≤ ${cur.value} → go left`,
        highlight: { ...seen },
        edgeHighlight: { ...seenEdges },
        codeLine: goRight ? 3 : 5,
      });
      const next = goRight ? cur.right : cur.left;
      if (next) seenEdges[edgeId(cur.id, next.id)] = "primary";
      cur = next;
    }
    if (candidate) {
      seen[candidate.id] = "success";
      steps.push({ log: `Predecessor of ${val} is ${candidate.value}`, highlight: { ...seen }, codeLine: 6 });
    } else {
      steps.push({ log: `${val} has no predecessor in this tree`, highlight: {}, codeLine: 1 });
    }
    return steps;
  };

  handleSuccessor = () => {
    const v = this.parseVal();
    if (v === null) {
      this.setState({ consoleLogs: ["⚠ Enter a valid numeric value"] });
      return;
    }
    this.runSteps(this.buildSuccessorSteps(v), "Successor");
  };

  buildSuccessorSteps = (val: number): Step[] => {
    const steps: Step[] = [{ log: `Successor(${val})`, highlight: {}, edgeHighlight: {} }];
    let cur = this.state.tree;
    let candidate: BSTNode | null = null;
    const seen: Record<string, HighlightKind> = {};
    const seenEdges: Record<string, HighlightKind> = {};
    while (cur) {
      const goLeft = val < cur.value;
      seen[cur.id] = "primary";
      if (goLeft) {
        candidate = cur;
        seen[cur.id] = "warning";
      }
      steps.push({
        log: goLeft ? `${val} < ${cur.value} → candidate, go left` : `${val} ≥ ${cur.value} → go right`,
        highlight: { ...seen },
        edgeHighlight: { ...seenEdges },
        codeLine: goLeft ? 3 : 5,
      });
      const next = goLeft ? cur.left : cur.right;
      if (next) seenEdges[edgeId(cur.id, next.id)] = "primary";
      cur = next;
    }
    if (candidate) {
      seen[candidate.id] = "success";
      steps.push({ log: `Successor of ${val} is ${candidate.value}`, highlight: { ...seen }, codeLine: 6 });
    } else {
      steps.push({ log: `${val} has no successor in this tree`, highlight: {}, codeLine: 1 });
    }
    return steps;
  };

  handleSelect = () => {
    const k = parseInt(this.state.selectInput, 10);
    if (isNaN(k) || k < 1) {
      this.setState({ consoleLogs: ["⚠ Enter a valid rank k ≥ 1"] });
      return;
    }
    this.runSteps(this.buildSelectSteps(k), "Select");
  };

  buildSelectSteps = (k: number): Step[] => {
    const steps: Step[] = [{ log: `Select(k=${k}) — find the ${k}-th smallest value`, highlight: {}, edgeHighlight: {} }];
    const seen: Record<string, HighlightKind> = {};
    const seenEdges: Record<string, HighlightKind> = {};
    let rank = 0;
    let result: BSTNode | null = null;
    const parentOf: Record<string, string> = {};
    const mapParents = (n: BSTNode | null) => {
      if (!n) return;
      if (n.left) {
        parentOf[n.left.id] = n.id;
        mapParents(n.left);
      }
      if (n.right) {
        parentOf[n.right.id] = n.id;
        mapParents(n.right);
      }
    };
    mapParents(this.state.tree);

    const rec = (n: BSTNode | null) => {
      if (!n || result) return;
      const pid = parentOf[n.id];
      if (pid) seenEdges[edgeId(pid, n.id)] = "primary";
      rec(n.left);
      if (result) return;
      rank++;
      seen[n.id] = "primary";
      steps.push({
        log: `In-order visit ${n.value} (rank ${rank})`,
        highlight: { ...seen },
        edgeHighlight: { ...seenEdges },
        codeLine: 3,
      });
      if (rank === k) {
        result = n;
        seen[n.id] = "success";
        steps.push({ log: `rank == k → ${n.value} is the ${k}-th smallest`, highlight: { ...seen }, codeLine: 3 });
        return;
      }
      rec(n.right);
    };
    rec(this.state.tree);

    if (!result) {
      steps.push({ log: `Tree only has ${rank} node(s) — no ${k}-th smallest value`, highlight: { ...seen } });
    }
    return steps;
  };

  handleRandomTree = () => {
    this.stopTimer();
    const size = this.props.randomTreeSize ?? 9;
    const vals = new Set<number>();
    while (vals.size < size) vals.add(1 + Math.floor(Math.random() * 99));
    let tree: BSTNode | null = null;
    vals.forEach((v) => {
      tree = insertPlain(tree, v);
    });
    this.setState({
      tree,
      highlight: {},
      edgeHighlight: {},
      activeCode: null,
      activeCodeLine: -1,
      consoleLogs: [`Generated random tree with ${vals.size} nodes`],
      currentOperation: "Random Tree",
      animationStatus: "complete",
      pendingSteps: [],
      stepIndex: -1,
    });
  };

  handleClearTree = () => {
    this.stopTimer();
    this.setState({
      tree: null,
      highlight: {},
      edgeHighlight: {},
      activeCode: null,
      activeCodeLine: -1,
      consoleLogs: ["Tree cleared"],
      currentOperation: "Idle",
      animationStatus: "idle",
      pendingSteps: [],
      stepIndex: -1,
    });
  };

  handleGlobalReset = () => {
    this.stopTimer();
    this.setState({
      tree: null,
      inputValue: "",
      selectInput: "",
      consoleLogs: [],
      highlight: {},
      edgeHighlight: {},
      activeCode: null,
      activeCodeLine: -1,
      currentOperation: "Idle",
      animationStatus: "idle",
      pendingSteps: [],
      stepIndex: -1,
      zoom: 1,
      panX: 0,
      panY: 0,
      activeTraversal: null,
    });
  };

  handleTraversal = (type: TraversalType) => {
    const order = getTraversalOrder(this.state.tree, type);
    if (!order.length) {
      this.setState({ consoleLogs: ["Tree is empty"] });
      return;
    }
    const parentOf: Record<string, string> = {};
    const mapParents = (n: BSTNode | null) => {
      if (!n) return;
      if (n.left) {
        parentOf[n.left.id] = n.id;
        mapParents(n.left);
      }
      if (n.right) {
        parentOf[n.right.id] = n.id;
        mapParents(n.right);
      }
    };
    mapParents(this.state.tree);

    const steps: Step[] = [{ log: `${type} Traversal started`, highlight: {}, edgeHighlight: {} }];
    const acc: Record<string, HighlightKind> = {};
    const accEdges: Record<string, HighlightKind> = {};
    order.forEach((n) => {
      acc[n.id] = "warning";
      const pid = parentOf[n.id];
      if (pid) accEdges[edgeId(pid, n.id)] = "warning";
      steps.push({ log: `Visit ${n.value}`, highlight: { ...acc }, edgeHighlight: { ...accEdges } });
    });
    steps.push({ log: `${type}: [${order.map((n) => n.value).join(", ")}]`, highlight: { ...acc }, edgeHighlight: { ...accEdges } });
    this.setState({ activeTraversal: type });
    this.runSteps(steps, type + " Traversal");
  };

  handleZoomIn = () => this.setState((s) => ({ zoom: Math.min(2.5, +(s.zoom + 0.15).toFixed(2)) }));
  handleZoomOut = () => this.setState((s) => ({ zoom: Math.max(0.4, +(s.zoom - 0.15).toFixed(2)) }));
  handleFit = () => this.setState({ zoom: 1, panX: 0, panY: 0 });
  handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.setState((s) => ({ zoom: Math.min(2.5, Math.max(0.4, +(s.zoom + delta).toFixed(2))) }));
  };
  handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) =>
    this.setState({
      isDragging: true,
      dragStartX: e.clientX,
      dragStartY: e.clientY,
      dragStartPanX: this.state.panX,
      dragStartPanY: this.state.panY,
    });
  handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!this.state.isDragging) return;
    const dx = e.clientX - this.state.dragStartX;
    const dy = e.clientY - this.state.dragStartY;
    this.setState({ panX: this.state.dragStartPanX + dx, panY: this.state.dragStartPanY + dy });
  };
  handleMouseUp = () => this.setState({ isDragging: false });

  handleThemeToggle = () => this.setState((s) => ({ theme: s.theme === "dark" ? "light" : "dark" }));
  handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    this.setState({ speedIndex: parseInt(e.target.value, 10) });
  toggleLeftSheet = () => this.setState((s) => ({ leftSidebarOpen: !s.leftSidebarOpen, rightSidebarOpen: false }));
  toggleRightSheet = () => this.setState((s) => ({ rightSidebarOpen: !s.rightSidebarOpen, leftSidebarOpen: false }));
  closeSheets = () => this.setState({ leftSidebarOpen: false, rightSidebarOpen: false });

  render() {
    const { state } = this;
    const c = tokensFor(state.theme);
    const isDark = state.theme === "dark";

    const layout = computeLayout(state.tree);
    const nodes = layout.nodes.map((n) => {
      const st = this.nodeStyleFor(n.id);
      return { ...n, fill: st.fill, stroke: st.stroke, text: st.text, pulsing: st.pulsing };
    });

    const opColors: Record<string, { bg: string; color: string }> = {
      Insert: { bg: "rgba(59,130,246,0.15)", color: "#3B82F6" },
      Delete: { bg: "rgba(239,68,68,0.15)", color: "#EF4444" },
      Search: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" },
      Predecessor: { bg: "rgba(34,197,94,0.15)", color: "#22C55E" },
      Successor: { bg: "rgba(34,197,94,0.15)", color: "#22C55E" },
      Select: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" },
      "Random Tree": { bg: "rgba(148,163,184,0.15)", color: c.muted },
      Idle: { bg: "rgba(148,163,184,0.15)", color: c.muted },
    };
    const opBadge = opColors[state.currentOperation] || { bg: "rgba(34,197,94,0.15)", color: "#22C55E" };

    const statusMap: Record<AnimationStatus, { label: string; bg: string; color: string; dotAnim: string }> = {
      idle: { label: "Idle", bg: "rgba(148,163,184,0.15)", color: c.muted, dotAnim: "none" },
      playing: {
        label: "Playing",
        bg: "rgba(59,130,246,0.15)",
        color: "#3B82F6",
        dotAnim: "dotBlink 1s ease-in-out infinite",
      },
      paused: { label: "Paused", bg: "rgba(245,158,11,0.15)", color: "#F59E0B", dotAnim: "none" },
      complete: { label: "Complete", bg: "rgba(34,197,94,0.15)", color: "#22C55E", dotAnim: "none" },
    };
    const statusBadge = statusMap[state.animationStatus];

    const tree = state.tree;
    const isEmpty = !tree;

    const traversalDefs: { key: TraversalType; label: string }[] = [
      { key: "Inorder", label: "Inorder" },
      { key: "Preorder", label: "Preorder" },
      { key: "Postorder", label: "Postorder" },
      { key: "Level Order", label: "Level Order" },
    ];
    const traversalTypes = traversalDefs.map((td) => {
      const active = state.activeTraversal === td.key && state.animationStatus === "playing";
      return {
        key: td.key,
        label: td.label,
        onClick: () => this.handleTraversal(td.key),
        bg: active ? "rgba(245,158,11,0.18)" : "transparent",
        border: active ? "rgba(245,158,11,0.5)" : c.border,
        color: active ? "#F59E0B" : c.text,
      };
    });

    const playDisabled =
      state.animationStatus === "playing" || state.animationStatus === "complete" || state.pendingSteps.length === 0;
    const pauseDisabled = state.animationStatus !== "playing";

    const canvasTransform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    const canvasTransition = state.isDragging ? "none" : "transform .25s ease";
    const wrapperCursor = state.isDragging ? "grabbing" : "grab";

    const legend = [
      { label: "Active / Comparing", color: "#3B82F6" },
      { label: "Found", color: "#22C55E" },
      { label: "Deleted", color: "#EF4444" },
      { label: "Traversed", color: "#F59E0B" },
    ];

    const leftSidebarClass = "left-sidebar" + (state.leftSidebarOpen ? " sheet-open" : "");
    const rightSidebarClass = "right-sidebar" + (state.rightSidebarOpen ? " sheet-open" : "");
    const showBackdrop = state.leftSidebarOpen || state.rightSidebarOpen;

    const mono = "var(--font-jetbrains-mono), monospace";

    return (
      <div
        style={{
          height: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: c.bg,
          color: c.text,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Top nav */}
        <div
          style={{
            height: 64,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: c.surface,
            borderBottom: `1px solid ${c.border}`,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "linear-gradient(135deg,#3B82F6,#22C55E)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5" r="2.6" fill="white" />
                <circle cx="5" cy="19" r="2.6" fill="white" />
                <circle cx="19" cy="19" r="2.6" fill="white" />
                <path
                  d="M12 7.6V13M12 13L6.2 17M12 13L17.8 17"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em" }}>BST Visualizer</span>
              <span style={{ fontSize: 11, color: c.muted, fontWeight: 500 }}>Binary Search Tree</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              className="icon-btn"
              onClick={this.handleThemeToggle}
              title="Toggle theme"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: `1px solid ${c.border}`,
                background: "transparent",
                color: c.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background .15s ease",
              }}
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3 7.2 7.2 0 0 0 21 12.8Z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="4.2" />
                  <path
                    d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              title="View source"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: `1px solid ${c.border}`,
                background: "transparent",
                color: c.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                transition: "background .15s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .5C5.65.5.5 5.66.5 12.03c0 5.1 3.29 9.43 7.86 10.96.57.1.78-.25.78-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.6.24 2.78.12 3.07.74.8 1.18 1.83 1.18 3.09 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.08.78 2.17v3.22c0 .3.21.66.79.55A10.53 10.53 0 0 0 23.5 12.03C23.5 5.66 18.35.5 12 .5Z" />
              </svg>
            </a>
            <button
              className="icon-btn"
              onClick={this.handleGlobalReset}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 10,
                border: `1px solid ${c.border}`,
                background: "transparent",
                color: c.text,
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                transition: "background .15s ease",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
              Reset
            </button>
          </div>
        </div>

        <div className="layout-grid" style={{ flex: 1, minHeight: 0, position: "relative" }}>
          {/* Left sidebar: controls */}
          <div
            className={leftSidebarClass}
            style={{
              width: 280,
              background: c.surface,
              borderRight: `1px solid ${c.border}`,
              padding: "22px 20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 26,
              animation: "cardIn .45s ease",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: c.muted,
                }}
              >
                Controls
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={{ fontSize: 12.5, color: c.muted, fontWeight: 500 }}>Enter Value</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 42"
                  value={state.inputValue}
                  onChange={this.handleInputChange}
                  onKeyDown={this.handleInputKeyDown}
                  className="input-focus"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  onClick={this.handleInsert}
                  className="btn-lift"
                  style={{
                    height: 38,
                    borderRadius: 10,
                    border: "none",
                    background: "#3B82F6",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "transform .12s ease,filter .12s ease",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Insert
                </button>
                <button
                  onClick={this.handleDelete}
                  disabled={isEmpty}
                  className="btn-lift-soft"
                  style={{
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid rgba(239,68,68,0.4)",
                    background: "rgba(239,68,68,0.1)",
                    color: "#EF4444",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "transform .12s ease,filter .12s ease",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M5 12h14" />
                  </svg>
                  Delete
                </button>
              </div>
              <button
                onClick={this.handleSearch}
                className="btn-lift-soft"
                style={{
                  height: 38,
                  borderRadius: 10,
                  border: "1px solid rgba(59,130,246,0.4)",
                  background: "rgba(59,130,246,0.1)",
                  color: "#3B82F6",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  transition: "transform .12s ease,filter .12s ease",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="M20 20l-4.5-4.5" strokeLinecap="round" />
                </svg>
                Search
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  onClick={this.handlePredecessor}
                  disabled={isEmpty}
                  className="btn-tint-hover"
                  style={{
                    height: 36,
                    borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    background: "transparent",
                    color: c.text,
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "background .12s ease",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M19 12H5M11 6l-6 6 6 6" />
                  </svg>
                  Predecessor
                </button>
                <button
                  onClick={this.handleSuccessor}
                  disabled={isEmpty}
                  className="btn-tint-hover"
                  style={{
                    height: 36,
                    borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    background: "transparent",
                    color: c.text,
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "background .12s ease",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  Successor
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={{ fontSize: 12.5, color: c.muted, fontWeight: 500 }}>Select(k) — k-th smallest</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 3"
                    value={state.selectInput}
                    onChange={this.handleSelectInputChange}
                    onKeyDown={this.handleSelectInputKeyDown}
                    className="input-focus"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: c.bg,
                      border: `1px solid ${c.border}`,
                      color: c.text,
                      fontSize: 14,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={this.handleSelect}
                    disabled={isEmpty}
                    className="btn-lift-soft"
                    style={{
                      height: 38,
                      padding: "0 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(245,158,11,0.4)",
                      background: "rgba(245,158,11,0.1)",
                      color: "#F59E0B",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "transform .12s ease,filter .12s ease",
                    }}
                  >
                    Go
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  onClick={this.handleRandomTree}
                  className="btn-tint-hover"
                  style={{
                    height: 36,
                    borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    background: "transparent",
                    color: c.text,
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "background .12s ease",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6h4l7 12h5M4 18h4l2.2-3.8M16 6h4M16 6l-2.5 2.5M20 6l-2.5-2.5M20 18l-2.5 2.5M20 18l-2.5-2.5" />
                  </svg>
                  Random
                </button>
                <button
                  onClick={this.handleClearTree}
                  disabled={isEmpty}
                  className="btn-tint-hover"
                  style={{
                    height: 36,
                    borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    background: "transparent",
                    color: c.muted,
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "background .12s ease",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6h16M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </svg>
                  Clear
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: c.border }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: c.muted,
                }}
              >
                Traversal
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {traversalTypes.map((tt) => (
                  <button
                    key={tt.key}
                    onClick={tt.onClick}
                    disabled={isEmpty}
                    className="btn-brighten"
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: `1px solid ${tt.border}`,
                      background: tt.bg,
                      color: tt.color,
                      fontSize: 12.5,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      transition: "background .12s ease",
                    }}
                  >
                    {tt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: c.border }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: c.muted,
                }}
              >
                Animation
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={state.speedIndex}
                  onChange={this.handleSpeedChange}
                  style={{ width: "100%", accentColor: "#3B82F6" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: c.muted, fontWeight: 500 }}>
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <button
                  onClick={this.handlePlay}
                  disabled={playDisabled}
                  className="btn-brighten"
                  style={{
                    height: 38,
                    borderRadius: 10,
                    border: "none",
                    background: "#22C55E",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    opacity: playDisabled ? 0.4 : 1,
                    transition: "filter .12s ease",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4.5v15l13-7.5z" />
                  </svg>
                </button>
                <button
                  onClick={this.handlePause}
                  disabled={pauseDisabled}
                  className="btn-tint-hover"
                  style={{
                    height: 38,
                    borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    background: "transparent",
                    color: c.text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    opacity: pauseDisabled ? 0.4 : 1,
                    transition: "background .12s ease",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4.5" width="4" height="15" rx="1" />
                    <rect x="14" y="4.5" width="4" height="15" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={this.handleResetAnimation}
                  className="btn-tint-hover"
                  style={{
                    height: 38,
                    borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    background: "transparent",
                    color: c.text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background .12s ease",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 4v5h5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Center canvas */}
          <div
            style={{
              position: "relative",
              backgroundColor: c.canvasBg,
              overflow: "hidden",
              backgroundImage: `radial-gradient(${c.dot} 1px, transparent 1px)`,
              backgroundSize: "26px 26px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: c.surface + "cc",
                backdropFilter: "blur(10px)",
                border: `1px solid ${c.border}`,
                borderRadius: 12,
                padding: "10px 14px",
                zIndex: 5,
              }}
            >
              {legend.map((lg) => (
                <div
                  key={lg.label}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: c.muted, fontWeight: 500 }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: lg.color, flexShrink: 0 }} />
                  {lg.label}
                </div>
              ))}
            </div>

            <div
              onWheel={this.handleWheel}
              onMouseDown={this.handleMouseDown}
              onMouseMove={this.handleMouseMove}
              onMouseUp={this.handleMouseUp}
              onMouseLeave={this.handleMouseUp}
              style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: wrapperCursor }}
            >
              {!isEmpty ? (
                <div
                  style={{
                    position: "relative",
                    width: layout.width,
                    height: layout.height,
                    transform: canvasTransform,
                    transition: canvasTransition,
                  }}
                >
                  <svg width={layout.width} height={layout.height} style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
                    {layout.edges.map((edge) => {
                      const es = this.edgeStyleFor(edge.id);
                      return (
                        <g key={edge.id}>
                          <line
                            x1={edge.x1}
                            y1={edge.y1}
                            x2={edge.x2}
                            y2={edge.y2}
                            stroke={es.lit ? es.stroke : c.edge}
                            strokeWidth={es.lit ? 3 : 2}
                            style={{
                              transition: "x1 .45s ease,y1 .45s ease,x2 .45s ease,y2 .45s ease,stroke .25s ease,stroke-width .25s ease",
                              filter: es.lit ? `drop-shadow(0 0 4px ${es.stroke})` : "none",
                            }}
                          />
                          {es.lit && (
                            <line
                              x1={edge.x1}
                              y1={edge.y1}
                              x2={edge.x2}
                              y2={edge.y2}
                              stroke="#fff"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeDasharray="10 90"
                              style={{
                                opacity: 0.9,
                                filter: `drop-shadow(0 0 5px ${es.stroke})`,
                                animation: "edgeLightTravel .7s linear infinite",
                              }}
                            />
                          )}
                        </g>
                      );
                    })}
                    {nodes.map((node) => (
                      <g key={node.id} style={{ transform: `translate(${node.x}px,${node.y}px)`, transition: "transform .45s cubic-bezier(.34,1.4,.64,1)" }}>
                        <circle
                          r={26}
                          fill={node.fill}
                          stroke={node.stroke}
                          strokeWidth={2.4}
                          className="node-hover"
                          style={{
                            transition: "fill .25s ease,stroke .25s ease,r .3s ease",
                            animation: node.pulsing ? "pulseGlow 1s ease-in-out infinite" : "none",
                            color: node.stroke,
                            cursor: "default",
                          }}
                        />
                      </g>
                    ))}
                  </svg>
                  <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                    {nodes.map((node) => (
                      <div
                        key={node.id}
                        style={{
                          position: "absolute",
                          left: node.x,
                          top: node.y,
                          transform: "translate(-50%,-50%)",
                          fontSize: 15,
                          fontWeight: 700,
                          color: node.text,
                          fontFamily: "var(--font-inter), sans-serif",
                          userSelect: "none",
                          transition: "left .45s cubic-bezier(.34,1.4,.64,1),top .45s cubic-bezier(.34,1.4,.64,1)",
                        }}
                      >
                        {node.value}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
                    <line x1="60" y1="22" x2="30" y2="52" stroke={c.border} strokeWidth="2" />
                    <line x1="60" y1="22" x2="90" y2="52" stroke={c.border} strokeWidth="2" />
                    <line x1="30" y1="52" x2="15" y2="80" stroke={c.border} strokeWidth="2" />
                    <line x1="30" y1="52" x2="45" y2="80" stroke={c.border} strokeWidth="2" />
                    <line x1="90" y1="52" x2="105" y2="80" stroke={c.border} strokeWidth="2" />
                    <circle cx="60" cy="22" r="12" fill={c.surfaceAlt} stroke={c.border} strokeWidth="2" />
                    <circle cx="30" cy="52" r="12" fill={c.surfaceAlt} stroke={c.border} strokeWidth="2" />
                    <circle cx="90" cy="52" r="12" fill={c.surfaceAlt} stroke={c.border} strokeWidth="2" />
                    <circle cx="15" cy="80" r="10" fill={c.surfaceAlt} stroke={c.border} strokeWidth="2" />
                    <circle cx="45" cy="80" r="10" fill={c.surfaceAlt} stroke={c.border} strokeWidth="2" />
                    <circle cx="105" cy="80" r="10" fill={c.surfaceAlt} stroke={c.border} strokeWidth="2" />
                  </svg>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 4 }}>Start by inserting a value</div>
                    <div style={{ fontSize: 12.5, color: c.muted }}>Type a number and hit Insert, or generate a random tree</div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                position: "absolute",
                bottom: 20,
                right: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: c.surface + "cc",
                backdropFilter: "blur(10px)",
                border: `1px solid ${c.border}`,
                borderRadius: 14,
                padding: "8px 12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                zIndex: 5,
              }}
            >
              <span style={{ fontSize: 11.5, color: c.muted, fontWeight: 600, fontFamily: mono }}>
                {["Slow", "Normal", "Fast"][state.speedIndex]}
              </span>
              <span style={{ width: 1, height: 14, background: c.border }} />
              <span style={{ fontSize: 11.5, color: c.muted, fontWeight: 600, fontFamily: mono }}>
                <span ref={this.fpsRef}>60</span> fps
              </span>
              <span style={{ width: 1, height: 14, background: c.border }} />
              <button
                onClick={this.handleZoomOut}
                className="zoom-btn"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  border: `1px solid ${c.border}`,
                  background: "transparent",
                  color: c.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <span style={{ fontSize: 11.5, color: c.text, fontWeight: 600, minWidth: 34, textAlign: "center", fontFamily: mono }}>
                {Math.round(state.zoom * 100)}%
              </span>
              <button
                onClick={this.handleZoomIn}
                className="zoom-btn"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  border: `1px solid ${c.border}`,
                  background: "transparent",
                  color: c.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                onClick={this.handleFit}
                title="Fit tree"
                className="zoom-btn"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  border: `1px solid ${c.border}`,
                  background: "transparent",
                  color: c.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H4v4M16 3h4v4M8 21H4v-4M16 21h4v-4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right sidebar: info */}
          <div
            className={rightSidebarClass}
            style={{
              width: 300,
              background: c.surface,
              borderLeft: `1px solid ${c.border}`,
              padding: "22px 20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              animation: "cardIn .45s ease",
            }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: c.muted }}>
              Information
            </span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 13, color: c.muted }}>Current Operation</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: opBadge.bg, color: opBadge.color }}>
                  {state.currentOperation}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 13, color: c.muted }}>Node Count</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: mono }}>{countNodes(tree)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 13, color: c.muted }}>Tree Height</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: mono }}>{tree ? heightOf(tree) : "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 13, color: c.muted }}>Root Node</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: mono }}>{tree ? tree.value : "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 13, color: c.muted }}>Leaf Nodes</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: mono }}>{countLeaves(tree)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 13, color: c.muted }}>Maximum Depth</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: mono }}>{tree ? heightOf(tree) + 1 : "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
                <span style={{ fontSize: 13, color: c.muted }}>Animation Status</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: statusBadge.bg,
                    color: statusBadge.color,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusBadge.color, animation: statusBadge.dotAnim }} />
                  {statusBadge.label}
                </span>
              </div>
            </div>

            {state.activeCode && (
              <>
                <div style={{ height: 1, background: c.border }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: c.muted }}>
                    Pseudocode
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: 10,
                      border: `1px solid ${c.border}`,
                      overflow: "hidden",
                      fontFamily: mono,
                      fontSize: 12,
                    }}
                  >
                    {state.activeCode.map((line, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "6px 12px 6px " + (12 + line.indent * 16) + "px",
                          background: i === state.activeCodeLine ? "rgba(59,130,246,0.18)" : "transparent",
                          borderLeft: i === state.activeCodeLine ? "3px solid #3B82F6" : "3px solid transparent",
                          color: i === state.activeCodeLine ? c.text : c.muted,
                          fontWeight: i === state.activeCodeLine ? 600 : 400,
                          whiteSpace: "pre",
                          transition: "background .2s ease,color .2s ease,border-color .2s ease",
                        }}
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom console */}
        <div
          className="console-panel"
          style={{
            height: 190,
            flexShrink: 0,
            background: c.surfaceAlt,
            borderTop: `1px solid ${c.border}`,
            display: "flex",
            flexDirection: "column",
            padding: "14px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: c.muted }}>
              Console
            </span>
            <span style={{ fontSize: 11.5, color: c.muted }}>Algorithm Steps</span>
          </div>
          <div ref={this.consoleRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
            {state.consoleLogs.map((line, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, fontFamily: mono, color: c.text, animation: "fadeInUp .3s ease both" }}
              >
                <span style={{ color: c.muted, fontWeight: 600, minWidth: 22 }}>{i}</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>

        {showBackdrop && (
          <div onClick={this.closeSheets} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 45 }} />
        )}

        <div className="mobile-fab" style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", gap: 8, zIndex: 46 }}>
          <button
            onClick={this.toggleLeftSheet}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 20,
              border: `1px solid ${c.border}`,
              background: c.surface,
              color: c.text,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
            }}
          >
            Controls
          </button>
          <button
            onClick={this.toggleRightSheet}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 20,
              border: `1px solid ${c.border}`,
              background: c.surface,
              color: c.text,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
            }}
          >
            Info
          </button>
        </div>
      </div>
    );
  }
}
