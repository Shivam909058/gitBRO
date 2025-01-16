import { useState } from 'react';
import { FaFolder, FaFolderOpen, FaFile, FaChevronRight, FaChevronDown } from 'react-icons/fa';

interface TreeNode {
  path: string;
  type: 'file' | 'dir';
  content?: string;
  children?: TreeNode[];
}

interface FileTreeProps {
  files: TreeNode[];
  onFileSelect: (file: { path: string; content: string; type: string }) => void;
}

export function FileTree({ files, onFileSelect }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));

  const getFileName = (path: string) => path.split('/').pop() || path;
  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    // Add more file type icons as needed
    switch (ext) {
      case 'js':
      case 'jsx':
        return '📄 ';
      case 'ts':
      case 'tsx':
        return '📘 ';
      case 'css':
      case 'scss':
        return '🎨 ';
      case 'json':
        return '⚙️ ';
      case 'md':
        return '📝 ';
      case 'html':
        return '🌐 ';
      default:
        return '📄 ';
    }
  };

  const sortNodes = (nodes: TreeNode[]) => {
    return nodes.sort((a, b) => {
      // Directories come first
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }
      // Then sort alphabetically
      return getFileName(a.path).localeCompare(getFileName(b.path));
    });
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const indent = level * 16;
    const fileName = getFileName(node.path);

    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer ${
            node.type === 'file' ? 'hover:text-blue-600' : ''
          }`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => {
            if (node.type === 'dir') {
              setExpandedFolders(prev => {
                const next = new Set(prev);
                if (next.has(node.path)) {
                  next.delete(node.path);
                } else {
                  next.add(node.path);
                }
                return next;
              });
            } else {
              onFileSelect({
                path: node.path,
                content: node.content || '',
                type: node.type
              });
            }
          }}
        >
          <span className="mr-2 w-5">
            {node.type === 'dir' ? (
              isExpanded ? (
                <FaChevronDown className="inline text-gray-500" />
              ) : (
                <FaChevronRight className="inline text-gray-500" />
              )
            ) : null}
          </span>
          <span className="mr-2">
            {node.type === 'dir' ? (
              isExpanded ? (
                <FaFolderOpen className="inline text-yellow-500" />
              ) : (
                <FaFolder className="inline text-yellow-500" />
              )
            ) : (
              <span>{getFileIcon(node.path)}</span>
            )}
          </span>
          <span className="truncate font-mono">{fileName}</span>
        </div>
        {node.type === 'dir' && isExpanded && node.children && (
          <div className="ml-2">
            {sortNodes(node.children).map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="font-mono text-sm">
      {sortNodes(files).map(node => renderNode(node))}
    </div>
  );
} 