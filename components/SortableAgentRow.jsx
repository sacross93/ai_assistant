'use client';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableAgentRow({ agent, children }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: agent.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        zIndex: isDragging ? 999 : 'auto',
        background: isDragging ? '#f8f9fa' : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style}>
            {/* Drag Handle Column - Replaces the original Index column */}
            <td style={{ padding: '12px', width: '80px', verticalAlign: 'middle' }}>
                <div
                    {...attributes}
                    {...listeners}
                    style={{
                        cursor: 'grab',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        touchAction: 'none', // Critical for mobile touch dragging
                    }}
                >
                    {/* Hamburger Icon */}
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 5H17V7H3V5ZM3 9H17V11H3V9ZM3 13H17V15H3V13Z" />
                    </svg>
                </div>
            </td>

            {/* Render the rest of the columns passed as children */}
            {children}
        </tr>
    );
}
