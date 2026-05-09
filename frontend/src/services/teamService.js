import api from '../utils/api';

/**
 * Team Service - Frontend API service layer
 * Handles all team-related API calls with proper error handling
 */
class TeamService {
  /**
   * Get all teams with pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} Teams data with pagination
   */
  async getTeams(params = {}) {
    try {
      const response = await api.get('/teams', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch teams');
    }
  }

  /**
   * Get team by ID
   * @param {String} teamId - Team ID
   * @returns {Promise} Team data
   */
  async getTeamById(teamId) {
    try {
      const response = await api.get(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch team');
    }
  }

  /**
   * Get team by slug
   * @param {String} slug - Team slug
   * @returns {Promise} Team data
   */
  async getTeamBySlug(slug) {
    try {
      const response = await api.get(`/teams/slug/${slug}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team by slug:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch team');
    }
  }

  /**
   * Create a new team
   * @param {Object} teamData - Team data
   * @returns {Promise} Created team
   */
  async createTeam(teamData) {
    try {
      const response = await api.post('/teams', teamData);
      return response.data;
    } catch (error) {
      console.error('Error creating team:', error);
      throw new Error(error.response?.data?.message || 'Failed to create team');
    }
  }

  /**
   * Update team
   * @param {String} teamId - Team ID
   * @param {Object} updateData - Update data
   * @returns {Promise} Updated team
   */
  async updateTeam(teamId, updateData) {
    try {
      const response = await api.put(`/teams/${teamId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating team:', error);
      throw new Error(error.response?.data?.message || 'Failed to update team');
    }
  }

  /**
   * Delete team
   * @param {String} teamId - Team ID
   * @returns {Promise} Delete response
   */
  async deleteTeam(teamId) {
    try {
      const response = await api.delete(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting team:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete team');
    }
  }

  /**
   * Get team members
   * @param {String} teamId - Team ID
   * @returns {Promise} Team members
   */
  async getTeamMembers(teamId) {
    try {
      const response = await api.get(`/teams/${teamId}/members`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch team members');
    }
  }

  /**
   * Add member to team
   * @param {String} teamId - Team ID
   * @param {Object} memberData - Member data
   * @returns {Promise} Updated team
   */
  async addTeamMember(teamId, memberData) {
    try {
      const response = await api.post(`/teams/${teamId}/members`, memberData);
      return response.data;
    } catch (error) {
      console.error('Error adding team member:', error);
      throw new Error(error.response?.data?.message || 'Failed to add team member');
    }
  }

  /**
   * Remove member from team
   * @param {String} teamId - Team ID
   * @param {String} userId - User ID
   * @returns {Promise} Updated team
   */
  async removeTeamMember(teamId, userId) {
    try {
      const response = await api.delete(`/teams/${teamId}/members/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing team member:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove team member');
    }
  }

  /**
   * Update member role
   * @param {String} teamId - Team ID
   * @param {String} userId - User ID
   * @param {String} role - New role
   * @returns {Promise} Updated team
   */
  async updateMemberRole(teamId, userId, role) {
    try {
      const response = await api.put(`/teams/${teamId}/members/${userId}`, { role });
      return response.data;
    } catch (error) {
      console.error('Error updating member role:', error);
      throw new Error(error.response?.data?.message || 'Failed to update member role');
    }
  }

  /**
   * Get user teams
   * @param {String} userId - User ID
   * @returns {Promise} User's teams
   */
  async getUserTeams(userId) {
    try {
      const response = await api.get(`/users/${userId}/teams`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user teams:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch user teams');
    }
  }

  /**
   * Get team statistics
   * @param {String} teamId - Team ID
   * @returns {Promise} Team statistics
   */
  async getTeamStats(teamId) {
    try {
      const response = await api.get(`/teams/${teamId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch team statistics');
    }
  }

  /**
   * Bulk operations for team management
   */

  /**
   * Bulk add members to team
   * @param {String} teamId - Team ID
   * @param {Array} members - Array of member data
   * @returns {Promise} Bulk operation results
   */
  async bulkAddMembers(teamId, members) {
    try {
      const results = await Promise.allSettled(
        members.map(member => this.addTeamMember(teamId, member))
      );
      
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');
      
      return {
        successful: successful.length,
        failed: failed.length,
        results: results
      };
    } catch (error) {
      console.error('Error in bulk add members:', error);
      throw new Error('Failed to perform bulk add members operation');
    }
  }

  /**
   * Bulk remove members from team
   * @param {String} teamId - Team ID
   * @param {Array} userIds - Array of user IDs
   * @returns {Promise} Bulk operation results
   */
  async bulkRemoveMembers(teamId, userIds) {
    try {
      const results = await Promise.allSettled(
        userIds.map(userId => this.removeTeamMember(teamId, userId))
      );
      
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');
      
      return {
        successful: successful.length,
        failed: failed.length,
        results: results
      };
    } catch (error) {
      console.error('Error in bulk remove members:', error);
      throw new Error('Failed to perform bulk remove members operation');
    }
  }

  /**
   * Get teams with filters and sorting
   * @param {Object} options - Advanced options
   * @returns {Promise} Filtered teams
   */
  async getTeamsWithFilters(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'active',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const params = {
      page,
      limit,
      ...(search && { search }),
      ...(status && status !== 'all' && { status }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder })
    };

    return this.getTeams(params);
  }

  /**
   * Search teams by name or description
   * @param {String} query - Search query
   * @param {Object} options - Additional options
   * @returns {Promise} Search results
   */
  async searchTeams(query, options = {}) {
    return this.getTeamsWithFilters({
      ...options,
      search: query
    });
  }

  /**
   * Get active teams only
   * @param {Object} options - Additional options
   * @returns {Promise} Active teams
   */
  async getActiveTeams(options = {}) {
    return this.getTeamsWithFilters({
      ...options,
      status: 'active'
    });
  }

  /**
   * Get inactive teams only
   * @param {Object} options - Additional options
   * @returns {Promise} Inactive teams
   */
  async getInactiveTeams(options = {}) {
    return this.getTeamsWithFilters({
      ...options,
      status: 'inactive'
    });
  }
}

// Create and export singleton instance
const teamService = new TeamService();
export default teamService;
