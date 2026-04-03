import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Settings, 
  Plus, 
  Trash2, 
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Search,
  User,
  Briefcase,
  Home,
  Star,
  MessageSquare,
  Globe,
  PlusCircle,
  Send,
  Loader2,
  Pencil,
  FileText,
  List,
  GitGraph,
  Clock,
  ArrowUpDown,
  X,
  Share2,
  Download,
  Maximize2,
  Minimize2,
  Zap,
  ZoomIn,
  ZoomOut,
  Type,
  Palette,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Utils
const safeJsonParse = (str: string | null, fallback: any) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return fallback;
  }
};

// Types
type View = 'tasks' | 'search' | 'chat' | 'profile' | 'create-work' | 'mindmap-studio';

interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  x: number;
  y: number;
  type?: 'task' | 'client' | 'note' | 'role';
  status?: string;
  assignee?: string;
  links?: string[];
  icon?: string;
  color?: string;
  fontFamily?: string;
  nodeStyle?: 'rounded' | 'square' | 'pill' | 'glass';
}

interface MindMapTitle {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
}

interface MindMapData {
  name?: string;
  title?: MindMapTitle;
  roots: MindMapNode[];
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: string;
}

interface Workspace {
  id: string;
  name: string;
  iconName: 'Briefcase' | 'Home' | 'Star' | 'Globe' | 'MessageSquare' | 'PlusCircle';
}

interface CustomApp {
  id: string;
  name: string;
  url: string;
  iconName: 'Globe' | 'Star' | 'Briefcase';
}

interface SavedWork {
  id: string;
  name: string;
  type: 'mindmap' | 'nota' | 'lista';
  createdAt: string;
  content: string;
}

const PREDEFINED_ICONS = [
  { id: 'Zap', icon: <Zap size={18} /> },
  { id: 'FileText', icon: <FileText size={18} /> },
  { id: 'Star', icon: <Star size={18} /> },
  { id: 'MessageSquare', icon: <MessageSquare size={18} /> },
  { id: 'Globe', icon: <Globe size={18} /> },
  { id: 'Briefcase', icon: <Briefcase size={18} /> },
  { id: 'Settings', icon: <Settings size={18} /> },
  { id: 'User', icon: <User size={18} /> },
  { id: 'CheckSquare', icon: <CheckSquare size={18} /> },
  { id: 'Calendar', icon: <Calendar size={18} /> },
  { id: 'Search', icon: <Search size={18} /> },
  { id: 'Briefcase', icon: <Briefcase size={18} /> },
  { id: 'Home', icon: <Home size={18} /> },
  { id: 'Clock', icon: <Clock size={18} /> },
  { id: 'Zap', icon: <Zap size={18} /> },
];

const NodeCard = ({ 
  node, 
  depth, 
  absX, 
  absY, 
  onUpdate, 
  onAdd, 
  onDelete,
  isSelected,
  onSelect
}: { 
  node: MindMapNode; 
  depth: number; 
  absX: number; 
  absY: number;
  onUpdate: (id: string, updates: Partial<MindMapNode>) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  key?: string | number;
}) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [activeLinkMenu, setActiveLinkMenu] = useState<number | null>(null);

  const handleAddLink = () => {
    if (newLink) {
      const links = node.links || [];
      onUpdate(node.id, { links: [...links, newLink] });
      setNewLink('');
      setShowLinkInput(false);
    }
  };

  const handleRemoveLink = (index: number) => {
    const links = [...(node.links || [])];
    links.splice(index, 1);
    onUpdate(node.id, { links });
    setActiveLinkMenu(null);
  };

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  };

  const currentIcon = PREDEFINED_ICONS.find(i => i.id === node.icon)?.icon || (depth === 0 ? <Zap size={18} /> : <FileText size={18} />);

  return (
    <div 
      style={{ left: absX, top: absY, transform: 'translate(-50%, -50%)' }}
      className={`absolute node-card group transition-shadow ${isSelected ? 'z-50' : 'z-10'}`}
      data-node-id={node.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
        setActiveLinkMenu(null);
      }}
    >
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: isSelected ? 1.05 : 1, 
          opacity: 1,
          boxShadow: isSelected ? `0 0 25px ${node.color || '#27e9b5'}66` : '0 10px 30px rgba(0,0,0,0.5)'
        }}
        className={`p-5 glass border transition-all neon-glow ${
          node.nodeStyle === 'square' ? 'rounded-none' : 
          node.nodeStyle === 'pill' ? 'rounded-[40px]' : 
          node.nodeStyle === 'glass' ? 'bg-white/5 backdrop-blur-xl border-white/20' : 'rounded-2xl'
        } ${
          isSelected ? 'border-[#27e9b5] neon-border' : 'border-white/10'
        } min-w-[220px] shadow-2xl hover:border-[#27e9b5]/50`}
        style={{ 
          backgroundColor: node.color ? `${node.color}11` : undefined,
          borderColor: isSelected ? (node.color || '#27e9b5') : undefined,
          fontFamily: node.fontFamily || 'inherit'
        }}
      >
        <div className="flex items-center gap-3 mb-3 relative">
          {/* Yellow Area: Icon Picker */}
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowIconPicker(!showIconPicker);
              }}
              className={`p-2 rounded-xl transition-all hover:scale-110 ${depth === 0 ? 'bg-black/10' : 'bg-[#27e9b5]/10 text-[#27e9b5]'}`}
              style={{ color: node.color || undefined }}
            >
              {currentIcon}
            </button>
            
            <AnimatePresence>
              {showIconPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 glass p-2 rounded-xl grid grid-cols-4 gap-2 z-50 shadow-2xl border border-white/10 w-44"
                >
                  {PREDEFINED_ICONS.map((iconObj, idx) => (
                    <button
                      key={`${iconObj.id}-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(node.id, { icon: iconObj.id });
                        setShowIconPicker(false);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg text-white"
                    >
                      {iconObj.icon}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Blue Area: Topic Name (White text) */}
          <input
            value={node.text}
            onChange={(e) => onUpdate(node.id, { text: e.target.value })}
            className={`bg-transparent border-none outline-none font-bold text-sm w-full text-white`}
            style={{ fontFamily: node.fontFamily || 'inherit' }}
            placeholder="Nome do Tópico"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Purple Area: Add Link Button */}
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowLinkInput(!showLinkInput);
              }}
              className={`p-1.5 rounded-lg transition-all text-white/40 hover:text-white`}
            >
              <PlusCircle size={16} />
            </button>

            <AnimatePresence>
              {showLinkInput && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-full right-0 mb-2 glass p-3 rounded-xl z-50 shadow-2xl border border-white/10 min-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input 
                    autoFocus
                    placeholder="Cole o link aqui..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#27e9b5] neon-border"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
                  />
                  <button 
                    onClick={handleAddLink}
                    className="w-full mt-2 py-2 bg-[#27e9b5] text-[#051824] rounded-lg text-xs font-bold neon-glow"
                  >
                    Adicionar Link
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          {/* Red Area: Favicons */}
          <div className="flex -space-x-2 overflow-visible">
            {node.links && node.links.length > 0 ? (
              node.links.map((link, i) => (
                <div key={i} className="relative group/link">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLinkMenu(activeLinkMenu === i ? null : i);
                    }}
                    className="w-7 h-7 rounded-full border-2 border-[#1e293b] bg-slate-700 flex items-center justify-center overflow-hidden hover:scale-125 transition-transform z-10"
                    title={link}
                  >
                    <img src={getFavicon(link) || ''} alt="favicon" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                  
                  <AnimatePresence>
                    {activeLinkMenu === i && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 10 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 glass p-1 rounded-lg flex gap-1 z-50 shadow-2xl border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-white/10 rounded text-[#27e9b5] neon-text"
                          onClick={() => setActiveLinkMenu(null)}
                        >
                          <Globe size={12} />
                        </a>
                        <button 
                          onClick={() => handleRemoveLink(i)}
                          className="p-1.5 hover:bg-red-400/10 rounded text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Desktop hover delete button (optional, keeping it for quick desktop use) */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLink(i);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 md:group-hover/link:opacity-100 transition-opacity z-20 hover:bg-red-600 hidden md:flex"
                  >
                    <X size={8} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-slate-500 font-medium italic">Sem links</div>
            )}
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Trash button removed from here as per user request */}
          </div>
        </div>
      </motion.div>
      
      {node.children.map(child => (
        <NodeCard 
          key={child.id} 
          node={child} 
          depth={depth + 1} 
          absX={absX + child.x} 
          absY={absY + child.y} 
          onUpdate={onUpdate}
          onAdd={onAdd}
          onDelete={onDelete}
          isSelected={isSelected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

const MindMapStudio = ({ 
  rootNode, 
  onSave, 
  onClose 
}: { 
  rootNode: any; 
  onSave: (data: MindMapData) => void; 
  onClose: () => void;
}) => {
  const [mapData, setMapData] = useState<MindMapData>(() => {
    if (rootNode && rootNode.roots) return rootNode;
    if (rootNode && rootNode.id) return { name: (rootNode.text || 'NOVO PROJETO').toUpperCase(), roots: [rootNode] };
    return { roots: [] };
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const PAN_LIMIT = 4000;

  const updatePan = (newPan: { x: number, y: number }) => {
    setPan({
      x: Math.min(Math.max(newPan.x, -PAN_LIMIT), PAN_LIMIT),
      y: Math.min(Math.max(newPan.y, -PAN_LIMIT), PAN_LIMIT)
    });
  };
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // New selection and dragging state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isStudioSidebarOpen, setIsStudioSidebarOpen] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartZoom, setTouchStartZoom] = useState(1);
  const [touchStartPan, setTouchStartPan] = useState({ x: 0, y: 0 });
  const [touchStartCenter, setTouchStartCenter] = useState({ x: 0, y: 0 });

  const [isDraggingTitle, setIsDraggingTitle] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showDesignMenu, setShowDesignMenu] = useState(false);
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const nodeCard = target.closest('.node-card') as HTMLElement;
    const titleEl = target.closest('.title-element') as HTMLElement;
    
    if (nodeCard) {
      const nodeId = nodeCard.getAttribute('data-node-id');
      if (nodeId) {
        setSelectedNodeId(nodeId);
        setIsDraggingNode(true);
        setDraggedNodeId(nodeId);
        const rect = nodeCard.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left - rect.width / 2,
          y: e.clientY - rect.top - rect.height / 2
        });
        return;
      }
    }

    if (titleEl) {
      setIsDraggingTitle(true);
      const rect = titleEl.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
      });
      return;
    }
    
    setSelectedNodeId(null);
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingNode && draggedNodeId) {
      const updatePosRecursive = (node: MindMapNode, parentAbsX: number, parentAbsY: number): MindMapNode => {
        if (node.id === draggedNodeId) {
          const newAbsX = (e.clientX - pan.x - dragOffset.x) / zoom;
          const newAbsY = (e.clientY - pan.y - dragOffset.y) / zoom;
          return { ...node, x: newAbsX - parentAbsX, y: newAbsY - parentAbsY };
        }
        return { ...node, children: node.children.map(c => updatePosRecursive(c, parentAbsX + node.x, parentAbsY + node.y)) };
      };
      
      setMapData(prev => ({
        ...prev,
        roots: prev.roots.map(root => updatePosRecursive(root, 0, 0))
      }));
      return;
    }

    if (isDraggingTitle && mapData.title) {
      const newAbsX = (e.clientX - pan.x - dragOffset.x) / zoom;
      const newAbsY = (e.clientY - pan.y - dragOffset.y) / zoom;
      setMapData(prev => ({
        ...prev,
        title: prev.title ? { ...prev.title, x: newAbsX, y: newAbsY } : undefined
      }));
      return;
    }

    if (!isDragging) return;
    updatePan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      setTouchStartDistance(dist);
      setTouchStartZoom(zoom);
      
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      setTouchStartCenter({ x: centerX, y: centerY });
      setTouchStartPan({ x: pan.x, y: pan.y });
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      const nodeCard = target.closest('.node-card') as HTMLElement;
      const titleEl = target.closest('.title-element') as HTMLElement;
      
      if (nodeCard) {
        const nodeId = nodeCard.getAttribute('data-node-id');
        if (nodeId) {
          setSelectedNodeId(nodeId);
          setIsDraggingNode(true);
          setDraggedNodeId(nodeId);
          const rect = nodeCard.getBoundingClientRect();
          setDragOffset({
            x: touch.clientX - rect.left - rect.width / 2,
            y: touch.clientY - rect.top - rect.height / 2
          });
          return;
        }
      }

      if (titleEl) {
        setIsDraggingTitle(true);
        const rect = titleEl.getBoundingClientRect();
        setDragOffset({
          x: touch.clientX - rect.left - rect.width / 2,
          y: touch.clientY - rect.top - rect.height / 2
        });
        return;
      }
      
      setSelectedNodeId(null);
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistance !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = dist / touchStartDistance;
      const newZoom = Math.min(Math.max(touchStartZoom * scale, 0.2), 2);
      setZoom(newZoom);
      
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const dx = centerX - touchStartCenter.x;
      const dy = centerY - touchStartCenter.y;
      updatePan({ x: touchStartPan.x + dx, y: touchStartPan.y + dy });
      
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isDraggingNode && draggedNodeId) {
        const updatePosRecursive = (node: MindMapNode, parentAbsX: number, parentAbsY: number): MindMapNode => {
          if (node.id === draggedNodeId) {
            const newAbsX = (touch.clientX - pan.x - dragOffset.x) / zoom;
            const newAbsY = (touch.clientY - pan.y - dragOffset.y) / zoom;
            return { ...node, x: newAbsX - parentAbsX, y: newAbsY - parentAbsY };
          }
          return { ...node, children: node.children.map(c => updatePosRecursive(c, parentAbsX + node.x, parentAbsY + node.y)) };
        };
        setMapData(prev => ({
          ...prev,
          roots: prev.roots.map(root => updatePosRecursive(root, 0, 0))
        }));
      } else if (isDraggingTitle && mapData.title) {
        const newAbsX = (touch.clientX - pan.x - dragOffset.x) / zoom;
        const newAbsY = (touch.clientY - pan.y - dragOffset.y) / zoom;
        setMapData(prev => ({
          ...prev,
          title: prev.title ? { ...prev.title, x: newAbsX, y: newAbsY } : undefined
        }));
      } else if (isDragging) {
        updatePan({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsDraggingNode(false);
    setIsDraggingTitle(false);
    setDraggedNodeId(null);
    setTouchStartDistance(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingNode(false);
    setIsDraggingTitle(false);
    setDraggedNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.2), 2);
    
    if (newZoom === zoom) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPanX = x - (x - pan.x) * (newZoom / zoom);
    const newPanY = y - (y - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    updatePan({ x: newPanX, y: newPanY });
  };

  const updateNode = (id: string, updates: Partial<MindMapNode>) => {
    const updateRecursive = (node: MindMapNode): MindMapNode => {
      if (node.id === id) return { ...node, ...updates };
      return { ...node, children: node.children.map(updateRecursive) };
    };
    setMapData(prev => ({
      ...prev,
      roots: prev.roots.map(updateRecursive)
    }));
  };

  const addRootTopic = () => {
    // Calculate the center of the screen in the map's coordinate system
    const centerX = (window.innerWidth / 2 - pan.x) / zoom - 2500;
    const centerY = (window.innerHeight / 2 - pan.y) / zoom - 2500;

    const newRoot: MindMapNode = {
      id: Date.now().toString(),
      text: 'Novo Tópico',
      children: [],
      x: centerX,
      y: centerY
    };
    setMapData(prev => ({ ...prev, roots: [...prev.roots, newRoot] }));
    setShowPlusMenu(false);
  };

  const addChildNode = (parentId: string, offsetX: number = 250, offsetY: number = 0) => {
    const newNode: MindMapNode = {
      id: Date.now().toString(),
      text: 'Novo Nó',
      children: [],
      x: offsetX,
      y: offsetY
    };
    const addRecursive = (node: MindMapNode): MindMapNode => {
      if (node.id === parentId) return { ...node, children: [...node.children, newNode] };
      return { ...node, children: node.children.map(addRecursive) };
    };
    setMapData(prev => ({
      ...prev,
      roots: prev.roots.map(addRecursive)
    }));
    setShowPlusMenu(false);
  };

  const addTitle = () => {
    if (mapData.title) return;
    setMapData(prev => ({
      ...prev,
      title: {
        text: 'Título do Mapa Mental',
        fontFamily: 'Outfit, sans-serif',
        fontSize: 48,
        color: '#ffffff',
        x: 0,
        y: -300
      }
    }));
    setShowPlusMenu(false);
  };

  const deleteNode = (id: string) => {
    setMapData(prev => ({
      ...prev,
      roots: prev.roots.filter(r => r.id !== id).map(root => {
        const deleteRecursive = (node: MindMapNode): MindMapNode => ({
          ...node,
          children: node.children.filter(c => c.id !== id).map(deleteRecursive)
        });
        return deleteRecursive(root);
      })
    }));
  };

  const renderConnections = (node: MindMapNode, parentX: number, parentY: number) => {
    return node.children.map(child => {
      const childX = parentX + child.x;
      const childY = parentY + child.y;
      
      // Curved path (S-curve)
      const midX = (parentX + childX) / 2;
      const path = `M ${parentX} ${parentY} C ${midX} ${parentY}, ${midX} ${childY}, ${childX} ${childY}`;

      return (
        <React.Fragment key={`conn-${child.id}`}>
          <path
            d={path}
            fill="none"
            stroke="rgba(255, 205, 0, 0.1)"
            strokeWidth="4"
          />
          <path
            d={path}
            fill="none"
            stroke="rgba(255, 205, 0, 0.3)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          {renderConnections(child, childX, childY)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#051824] flex flex-col overflow-hidden">
      {/* Studio Header */}
      <header className="h-24 md:h-32 border-b border-white/5 flex flex-col px-4 md:px-8 glass z-10 shrink-0 justify-center gap-2">
        {/* Top Row: Project Name */}
        <div className="flex justify-start items-center h-8">
          {isEditingProjectName ? (
            <input
              autoFocus
              value={mapData.name ?? ''}
              onChange={(e) => setMapData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
              onBlur={() => setIsEditingProjectName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingProjectName(false)}
              placeholder="NOME DO PROJETO"
              className="bg-white/5 border border-[#27e9b5]/30 rounded px-3 py-1 text-white font-bold outline-none focus:border-[#27e9b5] neon-border text-xs md:text-lg text-left min-w-[200px] uppercase"
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 
                className="text-white font-bold tracking-tight text-sm md:text-xl cursor-pointer hover:text-[#27e9b5] neon-text transition-colors uppercase"
                onClick={() => setIsEditingProjectName(true)}
              >
                {mapData.name || 'NOVO PROJETO'}
              </h2>
              <button 
                onClick={() => setIsEditingProjectName(true)}
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-slate-500 hover:text-[#27e9b5]"
                title="Editar nome do projeto"
              >
                <Pencil size={14} className="md:w-4 md:h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Row: Controls */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsStudioSidebarOpen(!isStudioSidebarOpen)}
              className="w-8 h-8 md:w-10 md:h-10 bg-[#27e9b5] rounded-lg md:rounded-xl flex items-center justify-center text-[#051824] hover:scale-110 transition-all shadow-lg shadow-[#27e9b5]/20 neon-glow"
            >
              <GitGraph size={16} className="md:w-5 md:h-5" />
            </button>
            <div className="hidden sm:flex flex-col">
              <p className="text-slate-500 text-[8px] md:text-[10px] font-medium uppercase tracking-widest leading-none">MindMap Studio</p>
              <span className="text-white/40 text-[8px] font-mono">v2.5.0</span>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            <div className="flex items-center gap-0.5 md:gap-1 glass p-0.5 md:p-1 rounded-lg md:rounded-xl mr-1 md:mr-4">
              <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg text-slate-400"><ZoomOut size={14} className="md:w-4 md:h-4" /></button>
              <span className="text-[10px] md:text-xs text-slate-400 font-mono w-8 md:w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg text-slate-400"><ZoomIn size={14} className="md:w-4 md:h-4" /></button>
            </div>
            <button className="p-2 md:p-3 glass rounded-lg md:rounded-xl text-slate-400 hover:text-white transition-all"><Share2 size={16} className="md:w-5 md:h-5" /></button>
            <button className="p-2 md:p-3 glass rounded-lg md:rounded-xl text-slate-400 hover:text-white transition-all"><Download size={16} className="md:w-5 md:h-5" /></button>
            <div className="w-px h-6 md:h-8 bg-white/10 mx-1 md:mx-2" />
            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Status</span>
                <span className="text-white text-xs font-mono">Pronto</span>
              </div>
              <div className="w-px h-8 bg-white/5 hidden md:block" />
              <button 
                onClick={() => { onSave(mapData); onClose(); }}
                className="px-3 md:px-6 py-2 md:py-3 bg-[#27e9b5] text-[#051824] rounded-lg md:rounded-xl font-bold hover:opacity-90 transition-all text-xs md:text-base whitespace-nowrap neon-glow"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Canvas Area */}
      <div 
        className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dotted Grid */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #27e9b5 1px, transparent 1px)',
            backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        />

        <div 
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
          className="absolute inset-0 transition-transform duration-75 ease-out"
        >
          <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
            {mapData.roots.map(root => renderConnections(root, 2500 + root.x, 2500 + root.y))}
          </svg>
          
          {mapData.title && (
            <div 
              style={{ left: 2500 + mapData.title.x, top: 2500 + mapData.title.y, transform: 'translate(-50%, -50%)' }}
              className="absolute title-element cursor-move group"
            >
              <input
                value={mapData.title.text}
                onChange={(e) => setMapData(prev => ({ ...prev, title: prev.title ? { ...prev.title, text: e.target.value } : undefined }))}
                className="bg-transparent border-none outline-none text-center font-black tracking-tighter"
                style={{ 
                  fontFamily: mapData.title.fontFamily, 
                  fontSize: `${mapData.title.fontSize}px`,
                  color: mapData.title.color
                }}
              />
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 glass p-2 rounded-xl flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setMapData(prev => ({ ...prev, title: prev.title ? { ...prev.title, fontSize: Math.max(prev.title.fontSize - 4, 12) } : undefined }))} className="p-1 hover:bg-white/10 rounded text-white"><Minimize2 size={14} /></button>
                <button onClick={() => setMapData(prev => ({ ...prev, title: prev.title ? { ...prev.title, fontSize: Math.min(prev.title.fontSize + 4, 120) } : undefined }))} className="p-1 hover:bg-white/10 rounded text-white"><Maximize2 size={14} /></button>
                <button onClick={() => setMapData(prev => ({ ...prev, title: undefined }))} className="p-1 hover:bg-red-400/20 rounded text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          )}

          {mapData.roots.map(root => (
            <NodeCard 
              key={root.id}
              node={root} 
              depth={0} 
              absX={2500 + root.x} 
              absY={2500 + root.y} 
              onUpdate={updateNode}
              onAdd={addChildNode}
              onDelete={deleteNode}
              isSelected={selectedNodeId === root.id}
              onSelect={setSelectedNodeId}
            />
          ))}
        </div>

        {/* Studio Sidebar (Compact Toolbar below icon) */}
        <AnimatePresence>
          {isStudioSidebarOpen && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-[104px] md:top-[136px] left-[4px] md:left-[24px] w-14 glass rounded-2xl border border-white/10 p-2 z-50 flex flex-col gap-4 shadow-2xl items-center studio-sidebar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowPlusMenu(!showPlusMenu);
                    setShowFontMenu(false);
                    setShowDesignMenu(false);
                  }}
                  className={`w-10 h-10 glass rounded-xl text-white font-bold flex items-center justify-center hover:bg-white/5 transition-all ${showPlusMenu ? 'bg-white/10' : ''}`}
                  title="Novo..."
                >
                  <Plus size={20} className="text-[#27e9b5] neon-text" />
                </button>
                
                {showPlusMenu && (
                  <div className="absolute left-full ml-2 top-0 glass p-2 rounded-xl flex flex-col gap-1 z-[60] border border-white/10 w-40">
                    <button onClick={addRootTopic} className="px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs text-left flex items-center gap-2">
                      <PlusCircle size={14} className="text-[#27e9b5]" /> Criar novo tópico
                    </button>
                    {selectedNodeId && (
                      <div className="px-3 py-2 border-t border-white/5 mt-1 space-y-2">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Adicionar Nó</span>
                        <div className="grid grid-cols-4 gap-1">
                          <button 
                            onClick={() => addChildNode(selectedNodeId, -250, 0)} 
                            className="p-1.5 hover:bg-white/5 rounded-lg text-white flex items-center justify-center"
                            title="Esquerda"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button 
                            onClick={() => addChildNode(selectedNodeId, 250, 0)} 
                            className="p-1.5 hover:bg-white/5 rounded-lg text-white flex items-center justify-center"
                            title="Direita"
                          >
                            <ChevronRight size={14} />
                          </button>
                          <button 
                            onClick={() => addChildNode(selectedNodeId, 0, -150)} 
                            className="p-1.5 hover:bg-white/5 rounded-lg text-white flex items-center justify-center"
                            title="Acima"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button 
                            onClick={() => addChildNode(selectedNodeId, 0, 150)} 
                            className="p-1.5 hover:bg-white/5 rounded-lg text-white flex items-center justify-center"
                            title="Abaixo"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                    {!mapData.title && (
                      <button onClick={addTitle} className="px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs text-left flex items-center gap-2">
                        <Type size={14} className="text-[#27e9b5]" /> Adicionar título
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-white/5" />

              {selectedNodeId ? (
                <div className="flex flex-col gap-3 items-center">
                  {/* Font Button */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowFontMenu(!showFontMenu);
                        setShowDesignMenu(false);
                        setShowPlusMenu(false);
                      }}
                      className={`w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/5 ${showFontMenu ? 'text-white bg-white/10' : 'text-[#27e9b5]'}`} 
                      title="Fontes"
                    >
                      <Type size={18} />
                    </button>
                    {showFontMenu && (
                      <div className="absolute left-full ml-2 top-0 glass p-2 rounded-xl flex flex-col gap-1 z-[60] border border-white/10 w-32 shadow-2xl">
                        {[
                          { name: 'Sans', family: 'Inter, sans-serif' },
                          { name: 'Serif', family: 'Georgia, serif' },
                          { name: 'Mono', family: 'JetBrains Mono, monospace' },
                          { name: 'Display', family: 'Outfit, sans-serif' }
                        ].map(font => (
                          <button
                            key={font.name}
                            onClick={() => {
                              updateNode(selectedNodeId, { fontFamily: font.family });
                              setShowFontMenu(false);
                            }}
                            className="px-2 py-1.5 hover:bg-white/10 rounded-lg text-white text-[10px] text-left font-medium"
                            style={{ fontFamily: font.family }}
                          >
                            {font.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Design Button (Grouped with Colors) */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowDesignMenu(!showDesignMenu);
                        setShowFontMenu(false);
                        setShowPlusMenu(false);
                      }}
                      className={`w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/5 ${showDesignMenu ? 'text-white bg-white/10' : 'text-[#27e9b5]'}`} 
                      title="Design"
                    >
                      <Palette size={18} />
                    </button>
                    {showDesignMenu && (
                      <div className="absolute left-full ml-2 top-0 glass p-4 rounded-2xl flex flex-col gap-5 z-[60] border border-white/10 w-48 shadow-2xl animate-in fade-in slide-in-from-left-2 duration-200">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cores do Tópico</label>
                          <div className="grid grid-cols-4 gap-2">
                            {['#27e9b5', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'].map(color => (
                              <button
                                key={color}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateNode(selectedNodeId, { color });
                                  setShowDesignMenu(false);
                                }}
                                className="w-8 h-8 rounded-lg border border-white/10 transition-all hover:scale-110 hover:border-white/30 shadow-lg"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Estilo do Nó</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'rounded', label: 'Arredondado', icon: <div className="w-5 h-4 border-2 border-white/40 rounded-md" /> },
                              { id: 'square', label: 'Quadrado', icon: <div className="w-5 h-4 border-2 border-white/40 rounded-none" /> },
                              { id: 'pill', label: 'Pílula', icon: <div className="w-5 h-4 border-2 border-white/40 rounded-full" /> },
                              { id: 'glass', label: 'Vidro', icon: <div className="w-5 h-4 border-2 border-white/40 rounded-md bg-white/20" /> }
                            ].map(style => (
                              <button
                                key={style.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateNode(selectedNodeId, { nodeStyle: style.id as any });
                                  setShowDesignMenu(false);
                                }}
                                className="p-3 hover:bg-white/10 rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                                title={style.label}
                              >
                                {style.icon}
                                <span className="text-[8px] text-slate-500 font-medium">{style.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedNodeId) {
                        deleteNode(selectedNodeId);
                        setSelectedNodeId(null);
                        setShowFontMenu(false);
                        setShowDesignMenu(false);
                      }
                    }}
                    disabled={!selectedNodeId}
                    className={`w-10 h-10 glass rounded-xl font-bold flex items-center justify-center transition-all active:scale-95 ${selectedNodeId ? 'text-red-400 hover:bg-red-400/10' : 'text-slate-600 opacity-50 cursor-not-allowed'}`}
                    title="Excluir Tópico"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : (
                <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-slate-600 cursor-help" title="Selecione um tópico">
                  <Pencil size={16} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Controls removed as per user request */}
      </div>
    </div>
  );
};

const IconMap = {
  Briefcase: <Briefcase size={18} />,
  Home: <Home size={18} />,
  Star: <Star size={18} />,
  Globe: <Globe size={18} />,
  MessageSquare: <MessageSquare size={18} />,
};

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const MindMapPreview: React.FC<{ content: string }> = ({ content }) => {
  const data = safeJsonParse(content, null) as MindMapData | null;
  if (!data || !data.roots) return <div className="flex items-center justify-center h-full text-slate-500">Erro ao carregar prévia</div>;

  // Find bounds to center and scale
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const traverse = (node: MindMapNode, px: number, py: number) => {
    const x = px + node.x;
    const y = py + node.y;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    node.children.forEach(c => traverse(c, x, y));
  };
  data.roots.forEach(r => traverse(r, 0, 0));

  // If no nodes found, return empty
  if (minX === Infinity) return <div className="flex items-center justify-center h-full text-slate-500">Mapa vazio</div>;

  const width = Math.max(maxX - minX + 400, 800);
  const height = Math.max(maxY - minY + 400, 600);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const renderNode = (node: MindMapNode, px: number, py: number, depth: number) => {
    const x = px + node.x;
    const y = py + node.y;
    return (
      <React.Fragment key={node.id}>
        {/* Connections */}
        {node.children.map(child => {
          const cx = x + child.x;
          const cy = y + child.y;
          return (
            <line 
              key={`${node.id}-${child.id}`}
              x1={x} y1={y} x2={cx} y2={cy}
              stroke="#27e9b5" strokeWidth={2 / Math.pow(1.2, depth)}
              strokeOpacity={0.4}
            />
          );
        })}
        {/* Node */}
        <circle cx={x} cy={y} r={depth === 0 ? 15 : 8} fill="#27e9b5" />
        <text 
          x={x} y={y + (depth === 0 ? 30 : 20)} 
          textAnchor="middle" 
          fill="white" 
          fontSize={depth === 0 ? 14 : 10}
          fontWeight={depth === 0 ? "bold" : "normal"}
          className="pointer-events-none"
        >
          {node.text}
        </text>
        {node.children.map(child => renderNode(child, x, y, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Visão Geral do Mapa</div>
      <div className="w-full h-full max-h-[500px] flex items-center justify-center">
        <svg 
          viewBox={`${centerX - width/2} ${centerY - height/2} ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {data.title && (
            <text 
              x={data.title.x} y={data.title.y} 
              textAnchor="middle" 
              fill={data.title.color} 
              fontSize={data.title.fontSize}
              fontFamily={data.title.fontFamily}
              fontWeight="black"
            >
              {data.title.text}
            </text>
          )}
          {data.roots.map(root => renderNode(root, 0, 0, 0))}
        </svg>
      </div>
      <div className="mt-4 text-[10px] text-slate-500 italic">Clique em editar para abrir no MindMap Studio</div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<View>('tasks');
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('nexus-tasks');
    return safeJsonParse(saved, [
      { id: '1', text: 'Design glassmorphic UI', completed: false, category: 'Work' },
      { id: '2', text: 'Implement task logic', completed: true, category: 'Work' },
      { id: '3', text: 'Explore Nexus features', completed: false, category: 'Personal' },
    ]);
  });

  const [activeWorkspace, setActiveWorkspace] = useState('Work');
  const [newTaskText, setNewTaskText] = useState('');
  const [customWorkspaces, setCustomWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem('nexus-workspaces');
    return safeJsonParse(saved, [
      { id: 'Work', name: 'Work', iconName: 'Briefcase' },
    ]);
  });

  const [customApps, setCustomApps] = useState<CustomApp[]>(() => {
    const saved = localStorage.getItem('nexus-apps');
    return safeJsonParse(saved, []);
  });

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string>('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState(() => {
    return localStorage.getItem('nexus-bg') || 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1920&q=80';
  });
  const [profileImage, setProfileImage] = useState(() => {
    return localStorage.getItem('nexus-profile-img') || null;
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('nexus-username') || 'Lopexz Lx7';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [showProfileActions, setShowProfileActions] = useState(false);

  // Dashboard State
  const [savedWorks, setSavedWorks] = useState<SavedWork[]>(() => {
    const saved = localStorage.getItem('nexus-saved-works');
    return safeJsonParse(saved, [
      { id: '1', name: 'Projeto Nexus', type: 'mindmap', createdAt: new Date().toISOString(), content: JSON.stringify({ id: 'root', text: 'Projeto Nexus', children: [], x: 0, y: 0 }) },
      { id: '2', name: 'Lista de Compras', type: 'lista', createdAt: new Date(Date.now() - 86400000).toISOString(), content: '[]' },
      { id: '3', name: 'Notas de Reunião', type: 'nota', createdAt: new Date(Date.now() - 172800000).toISOString(), content: '' },
    ]);
  });
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashboardSort, setDashboardSort] = useState<'recent' | 'oldest'>('recent');
  const [selectedWork, setSelectedWork] = useState<SavedWork | null>(null);

  // New Work Creation/Editing State
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [newWorkName, setNewWorkName] = useState('');
  const [newWorkType, setNewWorkType] = useState<'mindmap' | 'nota' | 'lista'>('mindmap');
  
  // Editor State
  const [currentMindMap, setCurrentMindMap] = useState<MindMapData | null>(null);
  const [currentNote, setCurrentNote] = useState('');
  const [currentChecklist, setCurrentChecklist] = useState<ChecklistItem[]>([]);

  // Auto-save logic
  useEffect(() => {
    if (editingWorkId && view === 'create-work') {
      const timer = setTimeout(() => {
        let content = '';
        if (newWorkType === 'mindmap') content = JSON.stringify(currentMindMap);
        if (newWorkType === 'nota') content = currentNote;
        if (newWorkType === 'lista') content = JSON.stringify(currentChecklist);

        setSavedWorks(prev => prev.map(w => 
          w.id === editingWorkId 
            ? { ...w, name: newWorkName, type: newWorkType, content } 
            : w
        ));
      }, 2000); // Auto-save after 2s of inactivity
      return () => clearTimeout(timer);
    }
  }, [currentMindMap, currentNote, currentChecklist, newWorkName, newWorkType, editingWorkId, view]);

  useEffect(() => {
    localStorage.setItem('nexus-bg', backgroundImage);
  }, [backgroundImage]);

  useEffect(() => {
    if (profileImage) {
      localStorage.setItem('nexus-profile-img', profileImage);
    }
  }, [profileImage]);

  useEffect(() => {
    localStorage.setItem('nexus-username', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('nexus-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('nexus-workspaces', JSON.stringify(customWorkspaces));
  }, [customWorkspaces]);

  useEffect(() => {
    localStorage.setItem('nexus-apps', JSON.stringify(customApps));
  }, [customApps]);

  useEffect(() => {
    localStorage.setItem('nexus-saved-works', JSON.stringify(savedWorks));
  }, [savedWorks]);

  const loadDashboard = () => {
    let filtered = savedWorks.filter(work => 
      work.name.toLowerCase().includes(dashboardSearch.toLowerCase())
    );

    if (dashboardSort === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return filtered;
  };

  const saveWork = () => {
    if (!newWorkName.trim()) return;

    let content = '';
    if (newWorkType === 'mindmap') content = JSON.stringify(currentMindMap);
    if (newWorkType === 'nota') content = currentNote;
    if (newWorkType === 'lista') content = JSON.stringify(currentChecklist);

    if (editingWorkId) {
      setSavedWorks(savedWorks.map(w => 
        w.id === editingWorkId 
          ? { ...w, name: newWorkName, type: newWorkType, content } 
          : w
      ));
    } else {
      const newWork: SavedWork = {
        id: Date.now().toString(),
        name: newWorkName,
        type: newWorkType,
        createdAt: new Date().toISOString(),
        content
      };
      setSavedWorks([newWork, ...savedWorks]);
    }

    setIsCreating(false);
    setEditingWorkId(null);
    setView('tasks');
    setNewWorkName('');
    setCurrentMindMap(null);
    setCurrentNote('');
    setCurrentChecklist([]);
  };

  const startNewWork = () => {
    setIsCreating(true);
    setEditingWorkId(null);
    setNewWorkName('');
    setNewWorkType('mindmap');
    setCurrentMindMap({ name: 'NOVO PROJETO', roots: [{ id: 'root', text: 'Novo Tópico', children: [], x: 0, y: 0 }] });
    setCurrentNote('');
    setCurrentChecklist([]);
    setView('create-work');
    setIsSidebarOpen(false);
  };

  const editWork = (work: SavedWork) => {
    setIsCreating(false);
    setEditingWorkId(work.id);
    setNewWorkName(work.name);
    setNewWorkType(work.type);
    
    if (work.type === 'mindmap') {
      const parsed = safeJsonParse(work.content, null);
      let data: MindMapData;
      if (parsed && parsed.roots) {
        data = { ...parsed, name: (parsed.name || work.name).toUpperCase() };
      } else if (parsed && parsed.id) {
        data = { name: work.name.toUpperCase(), roots: [parsed] };
      } else {
        data = { name: work.name.toUpperCase(), roots: [{ id: 'root', text: 'Novo Tópico', children: [], x: 0, y: 0 }] };
      }
      setCurrentMindMap(data);
      setView('mindmap-studio');
    } else {
      if (work.type === 'nota') setCurrentNote(work.content);
      if (work.type === 'lista') setCurrentChecklist(safeJsonParse(work.content, []));
      setView('create-work');
    }
    
    setSelectedWork(null);
  };

  const addWorkspace = () => {
    const name = prompt('Nome do novo workspace:');
    if (name) {
      const newWs: Workspace = { id: name, name, iconName: 'Briefcase' };
      setCustomWorkspaces([...customWorkspaces, newWs]);
    }
  };

  const addCustomApp = () => {
    const name = prompt('Nome do App:');
    const url = prompt('URL do App (ex: https://google.com):');
    if (name && url) {
      const newApp: CustomApp = { 
        id: Date.now().toString(), 
        name, 
        url: url.startsWith('http') ? url : `https://${url}`,
        iconName: 'Globe' 
      };
      setCustomApps([...customApps, newApp]);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...chatMessages, userMsg].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
      });
      const modelMsg: ChatMessage = { role: 'model', text: response.text || 'Sorry, I could not generate a response.' };
      setChatMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGoogleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for: ${searchQuery}`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      setSearchResults(response.text || 'No results found.');
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false,
      category: activeWorkspace,
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const filteredTasks = tasks.filter(t => t.category === activeWorkspace);
  const completionRate = filteredTasks.length > 0 
    ? Math.round((filteredTasks.filter(t => t.completed).length / filteredTasks.length) * 100) 
    : 0;

  return (
    <div 
      className="flex h-screen w-full overflow-hidden p-4 md:p-8 relative transition-all duration-700"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Toggle Button - Separated from Sidebar */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-8 left-8 z-50 w-12 h-12 rounded-2xl glass flex items-center justify-center text-[#27e9b5] shadow-xl hover:scale-110 active:scale-95 transition-transform neon-glow"
        title={isSidebarOpen ? "Fechar Menu" : "Abrir Menu"}
      >
        <LayoutDashboard size={24} />
      </button>

      {/* Sidebar Overlay Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: -300, 
              opacity: 0,
              transition: { duration: 0.2, ease: "circIn" }
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-[300px] h-full z-40 p-4 md:p-8"
          >
            <div className="glass-card p-4 md:p-6 h-full flex flex-col overflow-hidden">
              <div className="flex items-center gap-3 mb-10 px-2 mt-16">
                <h1 className="font-black text-2xl tracking-tight text-white">Nexus</h1>
              </div>

              <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Navigation</p>
                
                <button
                  onClick={() => { setView('tasks'); setActiveWorkspace('Work'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    view === 'tasks' && activeWorkspace === 'Work' ? 'bg-[#27e9b5] text-[#051824] font-bold neon-glow' : 'text-slate-300 hover:text-[#27e9b5]'
                  }`}
                >
                  <Home size={18} />
                  <span className="truncate font-medium">Início</span>
                </button>

                <button
                  onClick={startNewWork}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    view === 'create-work' ? 'bg-[#27e9b5] text-[#051824] font-bold neon-glow' : 'text-slate-400 hover:text-[#27e9b5]'
                  }`}
                >
                  <PlusCircle size={18} />
                  <span className="truncate font-medium">Novo Trabalho</span>
                </button>

                <button
                  onClick={() => { setView('search'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    view === 'search' ? 'bg-[#27e9b5] text-[#051824] font-bold neon-glow' : 'text-slate-300 hover:text-[#27e9b5]'
                  }`}
                >
                  <Globe size={18} />
                  <span className="truncate font-medium">Google Search</span>
                </button>

                <button
                  onClick={() => { setView('chat'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    view === 'chat' ? 'bg-[#27e9b5] text-[#051824] font-bold neon-glow' : 'text-slate-300 hover:text-[#27e9b5]'
                  }`}
                >
                  <MessageSquare size={18} />
                  <span className="truncate font-medium">IA Chatbot</span>
                </button>

                <div className="h-px bg-white/10 my-4 mx-2" />

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Apps & Tools</p>
                {customApps.map((app) => (
                  <a
                    key={app.id}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-[#27e9b5] transition-all"
                  >
                    <Globe size={18} />
                    <span className="truncate font-medium">{app.name}</span>
                  </a>
                ))}
                
                <button
                  onClick={addCustomApp}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-[#27e9b5] transition-all border-2 border-dashed border-white/10 mt-2"
                >
                  <PlusCircle size={18} />
                  <span className="truncate font-medium">Adicionar App</span>
                </button>
              </nav>

              <div className="mt-auto pt-4 border-t border-white/10">
                <button
                  onClick={() => { setView('profile'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    view === 'profile' ? 'bg-[#27e9b5] text-[#051824] font-bold neon-glow' : 'text-slate-300 hover:text-[#27e9b5]'
                  }`}
                >
                  <User size={18} />
                  <span className="truncate font-medium">Perfil</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full transition-all duration-300">
        {view === 'mindmap-studio' && currentMindMap && (
          <MindMapStudio 
            rootNode={currentMindMap} 
            onSave={(updated) => {
              setCurrentMindMap(updated);
              const content = JSON.stringify(updated);
              if (editingWorkId) {
                setSavedWorks(savedWorks.map(w => 
                  w.id === editingWorkId 
                    ? { ...w, content, name: updated.name || w.name } 
                    : w
                ));
              } else {
                const newWork: SavedWork = {
                  id: Date.now().toString(),
                  name: updated.name || 'NOVO PROJETO',
                  type: 'mindmap',
                  createdAt: new Date().toISOString(),
                  content
                };
                setSavedWorks([newWork, ...savedWorks]);
                setEditingWorkId(newWork.id);
              }
              // After saving, go to home
              setView('tasks');
              setSelectedWork(null);
            }}
            onClose={() => {
              setView('tasks');
              setSelectedWork(null);
            }}
          />
        )}

        {view === 'create-work' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar">
            {/* Header */}
            <header className="mb-6 md:mb-8 pl-16 md:pl-24 pr-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-5xl font-black text-white tracking-tight truncate">
                  {editingWorkId ? 'Editar Trabalho' : 'Novo Trabalho'}
                </h1>
                <p className="text-slate-400 mt-1 md:mt-2 font-medium text-sm md:text-lg">
                  {editingWorkId ? 'Aprimore sua criação no' : 'Crie algo incrível no'} <span className="text-[#27e9b5] neon-text">Nexus</span>
                </p>
              </div>
              <div className="flex gap-2 md:gap-4 w-full md:w-auto">
                <button
                  onClick={() => setView('tasks')}
                  className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 glass rounded-2xl font-bold text-white hover:bg-white/5 transition-all text-xs md:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveWork}
                  className="flex-[2] md:flex-none px-4 md:px-8 py-2.5 md:py-3 bg-[#27e9b5] text-[#051824] rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs md:text-base neon-glow"
                >
                  <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                  Salvar Trabalho
                </button>
              </div>
            </header>

            <div className="flex-1 flex flex-col gap-6 md:gap-8 min-h-0">
              {/* Config Section */}
              <div className="glass p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] flex flex-col md:flex-row gap-4 md:gap-6 shrink-0">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">Nome do Trabalho</label>
                  <input
                    type="text"
                    value={newWorkName}
                    onChange={(e) => setNewWorkName(e.target.value)}
                    placeholder="Ex: Planejamento 2024"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 md:px-6 py-2.5 md:py-3 text-white outline-none focus:border-[#27e9b5] neon-border transition-all text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">Tipo</label>
                  <div className="flex flex-wrap gap-2 p-1 glass rounded-2xl">
                    {[
                      { id: 'mindmap', icon: <GitGraph size={16} />, label: 'Mapa Mental' },
                      { id: 'nota', icon: <FileText size={16} />, label: 'Nota' },
                      { id: 'lista', icon: <List size={16} />, label: 'Lista' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setNewWorkType(t.id as any)}
                        className={`flex-1 min-w-[90px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all ${
                          newWorkType === t.id ? 'bg-[#27e9b5] text-[#051824] font-bold neon-glow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.icon}
                        <span className="text-xs md:text-sm">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editor Section */}
              <div className="flex-1 glass rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-8 overflow-hidden flex flex-col min-h-[300px]">
                {newWorkType === 'mindmap' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 md:gap-6 py-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-[#27e9b5]/10 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-[#27e9b5] shrink-0 neon-glow">
                      <GitGraph size={32} className="md:w-12 md:h-12" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2">MindMap Studio</h3>
                      <p className="text-slate-400 max-w-md text-sm md:text-base px-4">
                        Crie mapas mentais profissionais com nossa ferramenta exclusiva de edição visual.
                      </p>
                    </div>
                    <button
                      onClick={() => setView('mindmap-studio')}
                      className="px-6 md:px-8 py-3 md:py-4 bg-[#27e9b5] text-[#051824] rounded-2xl font-bold shadow-xl hover:opacity-90 transition-all flex items-center gap-3 text-sm md:text-base mt-2 neon-glow"
                    >
                      <Zap size={20} />
                      Abrir MindMap Studio
                    </button>
                  </div>
                )}

                {newWorkType === 'nota' && (
                  <textarea
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    placeholder="Comece a escrever suas notas aqui..."
                    className="flex-1 bg-transparent border-none outline-none text-slate-200 text-lg leading-relaxed resize-none custom-scrollbar"
                  />
                )}

                {newWorkType === 'lista' && (
                  <div className="flex-1 flex flex-col gap-6">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Adicionar item à lista..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (val) {
                              setCurrentChecklist([...currentChecklist, { id: Date.now().toString(), text: val, completed: false }]);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-[#27e9b5] neon-border transition-all"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                      {currentChecklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 glass rounded-2xl group">
                          <button
                            onClick={() => setCurrentChecklist(currentChecklist.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i))}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              item.completed ? 'bg-[#27e9b5] text-[#051824] neon-glow' : 'glass-inset'
                            }`}
                          >
                            {item.completed && <CheckSquare size={14} />}
                          </button>
                          <span className={`flex-1 ${item.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => setCurrentChecklist(currentChecklist.filter(i => i.id !== item.id))}
                            className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {view === 'tasks' && (
          <div className="flex-1 flex flex-col min-h-0">
            <AnimatePresence>
              {selectedWork && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 backdrop-blur-md bg-black/40"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="glass-card w-full max-w-4xl max-h-full overflow-hidden flex flex-col p-8"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          selectedWork.type === 'mindmap' ? 'bg-purple-500/20 text-purple-400' :
                          selectedWork.type === 'nota' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {selectedWork.type === 'mindmap' && <GitGraph size={24} />}
                          {selectedWork.type === 'nota' && <FileText size={24} />}
                          {selectedWork.type === 'lista' && <List size={24} />}
                        </div>
                        <div>
                          <h2 className="text-3xl font-black text-white">{selectedWork.name}</h2>
                          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">{selectedWork.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este trabalho?')) {
                              setSavedWorks(savedWorks.filter(w => w.id !== selectedWork.id));
                              setSelectedWork(null);
                            }
                          }}
                          className="p-2 glass rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
                          title="Excluir Trabalho"
                        >
                          <Trash2 size={24} />
                        </button>
                        <button
                          onClick={() => editWork(selectedWork)}
                          className="p-2 glass rounded-xl text-[#27e9b5] hover:bg-white/5 transition-all neon-text"
                          title="Editar Trabalho"
                        >
                          <Pencil size={24} />
                        </button>
                        <button
                          onClick={() => setSelectedWork(null)}
                          className="p-2 glass rounded-xl text-slate-400 hover:text-white transition-all"
                        >
                          <X size={24} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 glass-inset rounded-3xl p-4 md:p-8 overflow-y-auto custom-scrollbar">
                      {selectedWork.type === 'mindmap' ? (
                        <div className="w-full h-full min-h-[400px] relative bg-[#051824]/50 rounded-2xl overflow-hidden border border-white/5">
                          <MindMapPreview content={selectedWork.content} />
                        </div>
                      ) : (
                        <div className="prose prose-invert max-w-none">
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {selectedWork.content || "Este trabalho ainda não possui conteúdo detalhado."}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                      <p className="text-slate-500 text-xs self-center italic">Criado em: {new Date(selectedWork.createdAt).toLocaleString()}</p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <header className="mb-8 pl-20 md:pl-24 pr-4">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight truncate">Nexus</h1>
              <p className="text-slate-400 mt-2 font-medium text-base md:text-lg">Bem-vindo, <span className="text-[#27e9b5] neon-text">{userName}</span></p>
            </header>

            {/* Dashboard Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 glass rounded-3xl p-2 flex items-center">
                <Search size={18} className="ml-4 text-slate-500" />
                <input
                  type="text"
                  value={dashboardSearch}
                  onChange={(e) => setDashboardSearch(e.target.value)}
                  placeholder="Buscar trabalhos..."
                  className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="glass rounded-3xl p-2 flex items-center gap-2 px-4">
                <ArrowUpDown size={18} className="text-slate-500" />
                <select
                  value={dashboardSort}
                  onChange={(e) => setDashboardSort(e.target.value as 'recent' | 'oldest')}
                  className="bg-transparent border-none outline-none text-white font-medium cursor-pointer"
                >
                  <option value="recent" className="bg-[#051824]">Mais recentes</option>
                  <option value="oldest" className="bg-[#051824]">Mais antigos</option>
                </select>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                <AnimatePresence mode="popLayout">
                  {loadDashboard().map((work) => (
                    <motion.div
                      key={work.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedWork(work)}
                      className="glass p-6 rounded-[2rem] cursor-pointer hover:bg-white/5 transition-all border border-white/5 group"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          work.type === 'mindmap' ? 'bg-purple-500/20 text-purple-400' :
                          work.type === 'nota' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {work.type === 'mindmap' && <GitGraph size={24} />}
                          {work.type === 'nota' && <FileText size={24} />}
                          {work.type === 'lista' && <List size={24} />}
                        </div>
                        <div className="text-slate-500 group-hover:text-[#27e9b5] transition-colors neon-text">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2 truncate">{work.name}</h3>
                      
                      <div className="flex items-center gap-4 text-slate-500 text-xs font-medium">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(work.createdAt).toLocaleDateString()}
                        </div>
                        <div className="px-2 py-0.5 rounded-md bg-white/5 uppercase tracking-wider">
                          {work.type}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {loadDashboard().length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                    <Search size={48} className="mb-4 opacity-10" />
                    <p>Nenhum trabalho encontrado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'search' && (
          <div className="flex-1 flex flex-col min-h-0">
            <header className="mb-8 pl-20 md:pl-24 pr-4">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight truncate">Nexus</h1>
              <p className="text-slate-400 mt-2 font-medium text-base md:text-lg">Bem-vindo, <span className="text-[#27e9b5] neon-text">{userName}</span></p>
            </header>
            
            <div className="glass rounded-3xl p-2 flex items-center mb-8">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGoogleSearch()}
                placeholder="What are you looking for?"
                className="flex-1 bg-transparent border-none outline-none px-6 py-3 text-white placeholder:text-slate-500"
              />
              <button
                onClick={handleGoogleSearch}
                disabled={isSearchLoading}
                className="w-12 h-12 bg-[#27e9b5] text-[#051824] rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 flex-shrink-0 neon-glow"
              >
                {isSearchLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </button>
            </div>

            <div className="flex-1 glass-inset rounded-3xl p-8 overflow-y-auto custom-scrollbar">
              {isSearchLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Loader2 className="animate-spin mb-4" size={48} />
                  <p>Searching the web...</p>
                </div>
              ) : searchResults ? (
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-slate-200 leading-relaxed">
                    {searchResults}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Globe size={48} className="mb-4 opacity-10" />
                  <p>Enter a query to see results</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            <header className="mb-8 pl-20 md:pl-24 pr-4">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight truncate">Nexus</h1>
              <p className="text-slate-400 mt-2 font-medium text-base md:text-lg">Bem-vindo, <span className="text-[#27e9b5] neon-text">{userName}</span></p>
            </header>

            <div className="flex-1 glass-inset rounded-3xl p-6 mb-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <MessageSquare size={48} className="mb-4 opacity-10" />
                  <p>Start a conversation with Nexus AI</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-[#27e9b5] text-[#051824] shadow-lg rounded-tr-none font-medium neon-glow' 
                      : 'glass text-slate-200 rounded-tl-none'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="glass p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 className="animate-spin text-[#27e9b5]" size={16} />
                    <span className="text-xs text-slate-400">Nexus is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="glass rounded-3xl p-2 flex items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent border-none outline-none px-6 py-3 text-white placeholder:text-slate-500"
              />
              <button
                onClick={handleChat}
                disabled={isChatLoading}
                className="p-3 bg-[#27e9b5] text-[#051824] rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 neon-glow"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}
        {view === 'profile' && (
          <div className="flex-1 flex flex-col min-h-0 pt-20 md:pt-0">
            <div className="flex-1 glass rounded-[2.5rem] p-8 overflow-y-auto custom-scrollbar">
              <div className="max-w-2xl mx-auto space-y-12">
                {/* User Info Section */}
                <section className="flex flex-col items-center text-center relative">
                  <div className="relative group">
                    <button 
                      onClick={() => setShowProfileActions(!showProfileActions)}
                      className="w-24 h-24 rounded-full bg-[#27e9b5] flex items-center justify-center text-[#051824] mb-4 shadow-xl overflow-hidden border-4 border-white/10 hover:scale-105 transition-transform neon-glow"
                    >
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={48} />
                      )}
                    </button>

                    <AnimatePresence>
                      {showProfileActions && (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="absolute left-full top-1/2 -translate-y-1/2 ml-4 flex flex-col gap-2 z-10"
                        >
                          <label className="cursor-pointer p-2 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl shadow-xl hover:bg-white/20 hover:scale-110 active:scale-95 transition-all" title="Mudar Foto">
                            <Plus size={16} />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setProfileImage(reader.result as string);
                                    setShowProfileActions(false);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <button 
                            onClick={() => setShowProfileActions(false)}
                            className="p-2 bg-red-500/80 backdrop-blur-md text-white rounded-xl shadow-xl hover:bg-red-500 hover:scale-110 active:scale-95 transition-all" 
                            title="Cancelar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex flex-col items-center">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          onBlur={() => setIsEditingName(false)}
                          onKeyPress={(e) => e.key === 'Enter' && setIsEditingName(false)}
                          autoFocus
                          className="bg-white/5 border border-[#27e9b5] rounded-xl px-4 py-2 text-white outline-none text-xl font-bold text-center neon-border"
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={() => setIsEditingName(true)}
                        className="flex items-center gap-2 group cursor-pointer"
                      >
                        <h2 className="text-2xl font-bold text-white group-hover:text-[#27e9b5] neon-text transition-colors">
                          {userName}
                        </h2>
                        <Pencil size={16} className="text-slate-500 group-hover:text-[#27e9b5] transition-colors" />
                      </div>
                    )}
                  </div>
                </section>

                {/* Background Customization */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <PlusCircle className="text-[#27e9b5] neon-text" size={20} />
                    <h3 className="text-xl font-bold text-white">Imagem de Fundo</h3>
                  </div>
                  
                  <div className="glass-inset p-8 rounded-3xl space-y-6 flex flex-col items-center text-center">
                    <p className="text-slate-400 text-sm max-w-sm">
                      Selecione uma imagem do seu dispositivo para personalizar o fundo do seu Nexus.
                    </p>
                    
                    <label className="cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64String = reader.result as string;
                              setBackgroundImage(base64String);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="px-8 py-4 bg-[#27e9b5] text-[#051824] rounded-2xl font-bold shadow-lg group-hover:scale-105 group-active:scale-95 transition-all flex items-center gap-3 neon-glow">
                        <Plus size={20} />
                        Escolher Imagem
                      </div>
                    </label>

                    {backgroundImage && (
                      <button
                        onClick={() => setBackgroundImage('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1920&q=80')}
                        className="text-slate-500 text-xs hover:text-red-400 transition-all underline underline-offset-4"
                      >
                        Remover imagem personalizada
                      </button>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

