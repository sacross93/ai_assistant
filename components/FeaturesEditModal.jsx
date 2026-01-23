'use client';
import React, { useState } from 'react';

const MAX_FEATURES = 10;
const MAX_FEATURE_LENGTH = 100;

const FeaturesEditModal = ({ agentName, features, onSave, onCancel }) => {
    const [featuresList, setFeaturesList] = useState(features);
    const [errors, setErrors] = useState({});

    const handleFeatureChange = (index, value) => {
        const newList = [...featuresList];
        newList[index] = value;
        setFeaturesList(newList);

        // Clear error for this field
        if (errors[index]) {
            const newErrors = { ...errors };
            delete newErrors[index];
            setErrors(newErrors);
        }
    };

    const addFeature = () => {
        if (featuresList.length < MAX_FEATURES) {
            setFeaturesList([...featuresList, '']);
        }
    };

    const removeFeature = (index) => {
        const newList = featuresList.filter((_, i) => i !== index);
        setFeaturesList(newList);

        // Clear error for this field
        if (errors[index]) {
            const newErrors = { ...errors };
            delete newErrors[index];
            setErrors(newErrors);
        }
    };

    const handleSave = () => {
        // Validation
        const newErrors = {};
        featuresList.forEach((feature, index) => {
            if (feature.trim().length > MAX_FEATURE_LENGTH) {
                newErrors[index] = `최대 ${MAX_FEATURE_LENGTH}자까지 입력 가능합니다.`;
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Clean: trim and filter empty
        const cleaned = featuresList
            .map(f => f.trim())
            .filter(f => f.length > 0);

        onSave(cleaned);
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                width: '600px',
                maxWidth: '90%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                        주요 기능 편집 - {agentName}
                    </h3>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#999',
                            padding: '0',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                        * 각 기능은 최대 {MAX_FEATURE_LENGTH}자까지 입력 가능합니다<br />
                        * 최대 {MAX_FEATURES}개까지 추가할 수 있습니다<br />
                        * 빈 항목은 자동으로 제거됩니다
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {featuresList.map((feature, index) => (
                            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#999',
                                            minWidth: '24px',
                                            fontWeight: '600'
                                        }}>
                                            {index + 1}.
                                        </span>
                                        <input
                                            type="text"
                                            value={feature}
                                            onChange={(e) => handleFeatureChange(index, e.target.value)}
                                            placeholder="기능 설명 입력..."
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                border: `1px solid ${errors[index] ? '#e93e2f' : '#e5e8eb'}`,
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                outline: 'none',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => {
                                                if (!errors[index]) {
                                                    e.target.style.borderColor = '#007AFF';
                                                }
                                            }}
                                            onBlur={(e) => {
                                                if (!errors[index]) {
                                                    e.target.style.borderColor = '#e5e8eb';
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => removeFeature(index)}
                                            style={{
                                                background: '#fff5f5',
                                                border: '1px solid #ffdbdb',
                                                borderRadius: '6px',
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                color: '#e93e2f',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = '#ffe5e5';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = '#fff5f5';
                                            }}
                                            title="삭제"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    {errors[index] && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#e93e2f',
                                            marginTop: '4px',
                                            marginLeft: '32px'
                                        }}>
                                            {errors[index]}
                                        </div>
                                    )}
                                    <div style={{
                                        fontSize: '11px',
                                        color: feature.length > MAX_FEATURE_LENGTH ? '#e93e2f' : '#999',
                                        textAlign: 'right',
                                        marginTop: '4px'
                                    }}>
                                        {feature.length}/{MAX_FEATURE_LENGTH}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addFeature}
                        disabled={featuresList.length >= MAX_FEATURES}
                        style={{
                            marginTop: '16px',
                            padding: '10px 16px',
                            border: '1px dashed #d1d6db',
                            background: featuresList.length >= MAX_FEATURES ? '#f5f5f5' : 'white',
                            borderRadius: '6px',
                            cursor: featuresList.length >= MAX_FEATURES ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            color: featuresList.length >= MAX_FEATURES ? '#999' : '#333',
                            width: '100%',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (featuresList.length < MAX_FEATURES) {
                                e.target.style.background = '#f8f9fa';
                                e.target.style.borderColor = '#007AFF';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (featuresList.length < MAX_FEATURES) {
                                e.target.style.background = 'white';
                                e.target.style.borderColor = '#d1d6db';
                            }
                        }}
                    >
                        + 기능 추가 {featuresList.length >= MAX_FEATURES && '(최대 개수 도달)'}
                    </button>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e5e8eb' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            border: '1px solid #d1d6db',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#333'
                        }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#007AFF',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        저장하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeaturesEditModal;
