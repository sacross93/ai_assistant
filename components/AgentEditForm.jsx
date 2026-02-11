'use client';
import React, { useState, useEffect } from 'react';

const MAX_FEATURES = 10;
const MAX_FEATURE_LENGTH = 100;

export default function AgentEditForm({ agent, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: 1,
        features: []
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (agent) {
            setFormData({
                name: agent.name || '',
                description: agent.description || '',
                is_active: agent.is_active === 1 || agent.is_active === true ? 1 : 0,
                features: [...(agent.features || [])]
            });
        }
    }, [agent]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Feature List Handlers
    const handleFeatureChange = (index, value) => {
        const newFeatures = [...formData.features];
        newFeatures[index] = value;
        setFormData(prev => ({ ...prev, features: newFeatures }));
    };

    const addFeature = () => {
        if (formData.features.length < MAX_FEATURES) {
            setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
        }
    };

    const removeFeature = (index) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = '이름을 입력해주세요.';
        if (!formData.description.trim()) newErrors.description = '설명을 입력해주세요.';

        // Features validation
        const cleanedFeatures = formData.features
            .map(f => f.trim())
            .filter(f => f.length > 0);

        cleanedFeatures.forEach((f, i) => {
            if (f.length > MAX_FEATURE_LENGTH) {
                newErrors[`feature_${i}`] = `최대 ${MAX_FEATURE_LENGTH}자까지 입력 가능합니다.`;
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSave({
            ...agent,
            ...formData,
            features: cleanedFeatures
        });
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* ID (Read-only) */}
            <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                    Agent ID
                </label>
                <div style={{
                    padding: '10px 12px',
                    background: '#f5f5f7',
                    borderRadius: '8px',
                    color: '#666',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                }}>
                    {agent?.id}
                </div>
            </div>

            {/* Name */}
            <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111', marginBottom: '8px' }}>
                    이름 <span style={{ color: '#e93e2f' }}>*</span>
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Agent 이름 입력"
                    style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '15px',
                        border: `1px solid ${errors.name ? '#e93e2f' : '#ddd'}`,
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => !errors.name && (e.target.style.borderColor = '#007AFF')}
                    onBlur={(e) => !errors.name && (e.target.style.borderColor = '#ddd')}
                />
                {errors.name && <p style={{ fontSize: '13px', color: '#e93e2f', marginTop: '6px' }}>{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111', marginBottom: '8px' }}>
                    설명 <span style={{ color: '#e93e2f' }}>*</span>
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Agent에 대한 상세 설명"
                    rows={4}
                    style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '15px',
                        border: `1px solid ${errors.description ? '#e93e2f' : '#ddd'}`,
                        borderRadius: '8px',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: '1.5'
                    }}
                    onFocus={(e) => !errors.description && (e.target.style.borderColor = '#007AFF')}
                    onBlur={(e) => !errors.description && (e.target.style.borderColor = '#ddd')}
                />
                {errors.description && <p style={{ fontSize: '13px', color: '#e93e2f', marginTop: '6px' }}>{errors.description}</p>}
            </div>

            {/* Visibility */}
            <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={formData.is_active === 1}
                        onChange={(e) => handleChange('is_active', e.target.checked ? 1 : 0)}
                        style={{ width: '18px', height: '18px', accentColor: '#007AFF' }}
                    />
                    서비스에 노출하기
                </label>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', marginLeft: '26px' }}>
                    체크 해제 시 사이드바에서 숨겨집니다.
                </p>
            </div>

            {/* Features */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#111' }}>
                        주요 기능 ({formData.features.length}/{MAX_FEATURES})
                    </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {formData.features.map((feature, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="text"
                                    value={feature}
                                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                                    placeholder={`기능 ${index + 1}`}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        fontSize: '14px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        outline: 'none'
                                    }}
                                />
                                {feature.length > MAX_FEATURE_LENGTH && (
                                    <p style={{ fontSize: '12px', color: '#e93e2f', marginTop: '4px' }}>
                                        최대 {MAX_FEATURE_LENGTH}자까지 가능합니다.
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFeature(index)}
                                style={{
                                    width: '42px',
                                    background: '#fff5f5',
                                    border: '1px solid #ffebeb',
                                    borderRadius: '8px',
                                    color: '#e93e2f',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                                title="삭제"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>

                {formData.features.length < MAX_FEATURES && (
                    <button
                        type="button"
                        onClick={addFeature}
                        style={{
                            marginTop: '12px',
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px dashed #ccc',
                            background: 'white',
                            color: '#666',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        + 기능 추가하기
                    </button>
                )}
            </div>

            {/* Footer Actions */}
            <div style={{
                marginTop: 'auto',
                paddingTop: '24px',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
            }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        background: 'white',
                        color: '#333',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    취소
                </button>
                <button
                    type="submit"
                    style={{
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#007AFF',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,122,255,0.25)'
                    }}
                >
                    저장하기
                </button>
            </div>
        </form>
    );
}
