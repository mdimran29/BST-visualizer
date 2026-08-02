export interface BSTNode {
  id: string;
  value: number;
  left: BSTNode | null;
  right: BSTNode | null;
}

export type HighlightKind = "primary" | "success" | "warning" | "danger";

export interface Step {
  log: string;
  highlight?: Record<string, HighlightKind>;
  edgeHighlight?: Record<string, HighlightKind>;
  codeLine?: number;
  commit?: (tree: BSTNode | null) => BSTNode | null;
}

export function edgeId(parentId: string, childId: string): string {
  return parentId + "_" + childId;
}

export interface PseudocodeLine {
  text: string;
  indent: number;
}

export const PSEUDOCODE: Record<string, PseudocodeLine[]> = {
  Insert: [
    { text: "if node == null", indent: 0 },
    { text: "return new Node(v)", indent: 1 },
    { text: "else if v == node.value", indent: 0 },
    { text: "return node // already exists", indent: 1 },
    { text: "else if v < node.value", indent: 0 },
    { text: "node.left = insert(node.left, v)", indent: 1 },
    { text: "else", indent: 0 },
    { text: "node.right = insert(node.right, v)", indent: 1 },
  ],
  Delete: [
    { text: "if node == null", indent: 0 },
    { text: "return null", indent: 1 },
    { text: "else if v < node.value", indent: 0 },
    { text: "node.left = delete(node.left, v)", indent: 1 },
    { text: "else if v > node.value", indent: 0 },
    { text: "node.right = delete(node.right, v)", indent: 1 },
    { text: "else", indent: 0 },
    { text: "// found: splice node out", indent: 1 },
  ],
  Search: [
    { text: "if node == null", indent: 0 },
    { text: "return null", indent: 1 },
    { text: "else if node.value == v", indent: 0 },
    { text: "return node", indent: 1 },
    { text: "else if v < node.value", indent: 0 },
    { text: "search(node.left, v)", indent: 1 },
    { text: "else", indent: 0 },
    { text: "search(node.right, v)", indent: 1 },
  ],
  Predecessor: [
    { text: "if node == null", indent: 0 },
    { text: "return null // not found", indent: 1 },
    { text: "else if v > node.value", indent: 0 },
    { text: "candidate = node; go right", indent: 1 },
    { text: "else if v <= node.value", indent: 0 },
    { text: "go left", indent: 1 },
    { text: "return candidate", indent: 0 },
  ],
  Successor: [
    { text: "if node == null", indent: 0 },
    { text: "return null // not found", indent: 1 },
    { text: "else if v < node.value", indent: 0 },
    { text: "candidate = node; go left", indent: 1 },
    { text: "else if v >= node.value", indent: 0 },
    { text: "go right", indent: 1 },
    { text: "return candidate", indent: 0 },
  ],
  Select: [
    { text: "rank = 0", indent: 0 },
    { text: "inorder(node):", indent: 0 },
    { text: "inorder(node.left)", indent: 1 },
    { text: "rank++; if rank == k: return node", indent: 1 },
    { text: "inorder(node.right)", indent: 1 },
  ],
};

export type AnimationStatus = "idle" | "playing" | "paused" | "complete";
export type TraversalType = "Inorder" | "Preorder" | "Postorder" | "Level Order";

export function deepClone(n: BSTNode | null): BSTNode | null {
  if (!n) return null;
  return { id: n.id, value: n.value, left: deepClone(n.left), right: deepClone(n.right) };
}

export function insertPlain(n: BSTNode | null, val: number): BSTNode {
  if (!n) return { id: "n" + val, value: val, left: null, right: null };
  if (val === n.value) return n;
  if (val < n.value) return { ...n, left: insertPlain(n.left, val) };
  return { ...n, right: insertPlain(n.right, val) };
}

export function deleteByValue(n: BSTNode | null, val: number): BSTNode | null {
  if (!n) return null;
  if (val < n.value) return { ...n, left: deleteByValue(n.left, val) };
  if (val > n.value) return { ...n, right: deleteByValue(n.right, val) };
  if (!n.left) return n.right;
  if (!n.right) return n.left;
  let succ = n.right;
  while (succ.left) succ = succ.left;
  return { id: "n" + succ.value, value: succ.value, left: n.left, right: deleteByValue(n.right, succ.value) };
}

export function attachChild(
  tree: BSTNode | null,
  parentId: string,
  side: "left" | "right",
  val: number
): BSTNode | null {
  const clone = deepClone(tree);
  const rec = (n: BSTNode | null): boolean => {
    if (!n) return false;
    if (n.id === parentId) {
      n[side] = { id: "n" + val, value: val, left: null, right: null };
      return true;
    }
    return rec(n.left) || rec(n.right);
  };
  rec(clone);
  return clone;
}

export function countNodes(n: BSTNode | null): number {
  return !n ? 0 : 1 + countNodes(n.left) + countNodes(n.right);
}

export function countLeaves(n: BSTNode | null): number {
  if (!n) return 0;
  return !n.left && !n.right ? 1 : countLeaves(n.left) + countLeaves(n.right);
}

export function heightOf(n: BSTNode | null): number {
  return !n ? -1 : 1 + Math.max(heightOf(n.left), heightOf(n.right));
}

export interface LaidOutNode {
  id: string;
  value: number;
  x: number;
  y: number;
}
export interface LaidOutEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface Layout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
}

export function computeLayout(tree: BSTNode | null): Layout {
  if (!tree) return { nodes: [], edges: [], width: 900, height: 400 };
  let counter = 0;
  const xGap = 90,
    yGap = 100,
    topPad = 50,
    leftPad = 60;
  const pos: Record<string, { x: number; y: number }> = {};
  const visit = (n: BSTNode | null, depth: number) => {
    if (!n) return;
    visit(n.left, depth + 1);
    pos[n.id] = { x: leftPad + counter * xGap, y: topPad + depth * yGap };
    counter++;
    visit(n.right, depth + 1);
  };
  visit(tree, 0);

  const nodes: LaidOutNode[] = [];
  const edges: LaidOutEdge[] = [];
  const collect = (n: BSTNode | null) => {
    if (!n) return;
    const p = pos[n.id];
    nodes.push({ id: n.id, value: n.value, x: p.x, y: p.y });
    if (n.left) {
      const cp = pos[n.left.id];
      edges.push({ id: n.id + "_" + n.left.id, x1: p.x, y1: p.y, x2: cp.x, y2: cp.y });
    }
    if (n.right) {
      const cp = pos[n.right.id];
      edges.push({ id: n.id + "_" + n.right.id, x1: p.x, y1: p.y, x2: cp.x, y2: cp.y });
    }
    collect(n.left);
    collect(n.right);
  };
  collect(tree);

  return {
    nodes,
    edges,
    width: Math.max(leftPad * 2 + (counter - 1) * xGap, 300),
    height: Math.max(topPad * 2 + heightOf(tree) * yGap, 250),
  };
}

export function getTraversalOrder(tree: BSTNode | null, type: TraversalType): BSTNode[] {
  const res: BSTNode[] = [];
  if (type === "Inorder") {
    const rec = (n: BSTNode | null) => {
      if (!n) return;
      rec(n.left);
      res.push(n);
      rec(n.right);
    };
    rec(tree);
  } else if (type === "Preorder") {
    const rec = (n: BSTNode | null) => {
      if (!n) return;
      res.push(n);
      rec(n.left);
      rec(n.right);
    };
    rec(tree);
  } else if (type === "Postorder") {
    const rec = (n: BSTNode | null) => {
      if (!n) return;
      rec(n.left);
      rec(n.right);
      res.push(n);
    };
    rec(tree);
  } else {
    if (tree) {
      const q: BSTNode[] = [tree];
      while (q.length) {
        const n = q.shift()!;
        res.push(n);
        if (n.left) q.push(n.left);
        if (n.right) q.push(n.right);
      }
    }
  }
  return res;
}
