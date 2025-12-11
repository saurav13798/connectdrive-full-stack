import { useState, useEffect } from 'react';
import axios from 'axios';

interface Organization {
  id: string;
  name: string;
  description: string;
  members: Array<{
    id: string;
    user: {
      id: string;
      displayName: string;
      email: string;
    };
    role: string;
  }>;
}

interface OrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OrganizationModal({ isOpen, onClose }: OrganizationModalProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadOrganizations();
    }
  }, [isOpen]);

  const loadOrganizations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/organizations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOrganizations(response.data);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const createOrganization = async () => {
    if (!newOrgName.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/organizations`,
        {
          name: newOrgName,
          description: newOrgDescription,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setNewOrgName('');
      setNewOrgDescription('');
      setShowCreateForm(false);
      loadOrganizations();
    } catch (error) {
      console.error('Error creating organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (orgId: string) => {
    if (!newMemberEmail.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      // First, we need to find the user by email (this would need a backend endpoint)
      // For now, we'll assume the email is the userId
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/organizations/${orgId}/members`,
        {
          userId: newMemberEmail, // This should be userId, not email
          role: 'member',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setNewMemberEmail('');
      loadOrganizations();
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Organizations</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!showCreateForm && !selectedOrg ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Your Organizations</h3>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Organization
                </button>
              </div>

              <div className="space-y-3">
                {organizations.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No organizations yet</p>
                    <p className="text-sm text-gray-400">Create an organization to collaborate with your team</p>
                  </div>
                ) : (
                  organizations.map((org) => (
                    <div
                      key={org.id}
                      className="card card-hover p-4 cursor-pointer"
                      onClick={() => setSelectedOrg(org)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{org.name}</h4>
                          <p className="text-sm text-gray-500">{org.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {org.members?.length || 0} members
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : showCreateForm ? (
            <div>
              <div className="flex items-center mb-4">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 mr-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-lg font-medium text-gray-900">Create Organization</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Enter organization name"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newOrgDescription}
                    onChange={(e) => setNewOrgDescription(e.target.value)}
                    placeholder="Describe your organization"
                    rows={3}
                    className="input-field"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={createOrganization}
                    disabled={loading || !newOrgName.trim()}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Creating...' : 'Create Organization'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : selectedOrg ? (
            <div>
              <div className="flex items-center mb-4">
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="text-gray-400 hover:text-gray-600 mr-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedOrg.name}</h3>
                  <p className="text-sm text-gray-500">{selectedOrg.description}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Members</h4>
                  <div className="space-y-2">
                    {selectedOrg.members?.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {member.user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.user.displayName}</p>
                            <p className="text-sm text-gray-500">{member.user.email}</p>
                          </div>
                        </div>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Add Member</h4>
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="input-field flex-1"
                    />
                    <button
                      onClick={() => addMember(selectedOrg.id)}
                      disabled={!newMemberEmail.trim()}
                      className="btn-primary"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}