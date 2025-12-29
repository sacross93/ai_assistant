import React from 'react';

/**
 * AgentModal Component
 * Displays detailed information about a specific agent.
 * 
 * Props:
 * - agent: object | null - The agent to display (null if closed)
 * - onClose: function - Handler to close modal
 * - onUseAgent: function(id) - Handler to select/use the agent
 */
const AgentModal = ({ agent, onClose, onUseAgent }) => {
    // If no agent is selected, don't render or render hidden
    // The CSS controls visibility via class 'active' on overlay
    // But in React it's often cleaner to not render, OR render with conditional class.
    // Based on original CSS, .modal-overlay.active is visible.

    // We will control the 'active' class based on the 'agent' prop presence.
    const isActive = !!agent;

    if (!isActive) return null; // Or return hidden div if animation requires presence

    // However, for transition out, we might need it mounted. 
    // The original CSS has transitions. 
    // For simplicity in this step, we'll just mount/unmount or toggle class.
    // Let's render always but control class for now, or just simple conditional rendering.
    // If we unmount, we lose the close animation.
    // But simpler React logic usually unmounts. 
    // Let's stick to conditional rendering for simplicity, losing close animation slightly, 
    // or we can keep it mounted and just toggle class.
    // For now, let's just render the structure with 'active' class if agent exists.

    return (
        <div className={`modal-overlay ${isActive ? 'active' : ''}`} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{agent.name}</h2>
                    <button className="close-modal-btn" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <p>{agent.description}</p>
                    <div className="modal-features">
                        <h4>주요 기능</h4>
                        <ul>
                            {agent.features.map((feature, idx) => (
                                <li key={idx}>{feature}</li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="modal-footer">
                    <button
                        className="btn-primary"
                        onClick={() => {
                            onUseAgent(agent.id);
                            onClose();
                        }}
                    >
                        이 Agent 사용하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentModal;
