import React from 'react';

/**
 * AgentList Component
 * Renders the list of available AI agents.
 * 
 * Props:
 * - agents: Array - List of agent objects
 * - selectedAgentId: string - ID of currently selected agent
 * - onSelectAgent: function(id) - Handler for selecting an agent
 * - onOpenModal: function(id) - Handler for opening agent details
 */
const AgentList = ({ agents, selectedAgentId, onSelectAgent, onOpenModal }) => {
    return (
        <div className="agent-list" id="agentList">
            {agents.map(agent => (
                <div
                    key={agent.id}
                    className={`agent-card ${selectedAgentId === agent.id ? 'selected' : ''}`}
                    onClick={() => onSelectAgent(agent.id)}
                >
                    <div className="agent-radio"></div>
                    <div className="agent-info">
                        <div className="agent-name">{agent.name}</div>
                    </div>
                    <button
                        className="detail-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenModal(agent.id);
                        }}
                    >
                        자세히
                    </button>
                </div>
            ))}
        </div>
    );
};

export default AgentList;
