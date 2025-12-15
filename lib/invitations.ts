import { supabase } from './supabase';

export interface Invitation {
  id?: number;
  token: string;
  tenant_id: number;
  tenant_email: string;
  tenant_name: string;
  is_accepted: boolean;
  created_at?: string;
  expires_at?: string;
  accepted_at?: string;
}

/**
 * Generate a random token string (alternative to UUID)
 */
const generateToken = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  const randomStr2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomStr}-${randomStr2}`;
};

/**
 * Create a new invitation for a tenant
 */
export const createInvitation = async (
  tenantId: string | number,
  tenantEmail: string,
  tenantName: string
): Promise<Invitation> => {
  try {
    console.log('🔧 Creating invitation in database...', {
      tenantId,
      tenantEmail,
      tenantName
    });

    // Convert tenantId to number
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;

    if (isNaN(tenantIdNum)) {
      throw new Error('Invalid tenant ID');
    }

    // Validate inputs
    if (!tenantIdNum || !tenantEmail || !tenantName) {
      throw new Error('Missing required fields: tenantId, tenantEmail, or tenantName');
    }

    // Check if tenant already has a pending invitation
    const { data: existingInvite, error: checkError } = await supabase
      .from('invitations')
      .select('*')
      .eq('tenant_id', tenantIdNum)
      .eq('is_accepted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError) {
      console.error('⚠️ Error checking existing invitations:', checkError);
    }

    // If there's a recent pending invitation (within 1 hour), return it
    if (existingInvite) {
      const createdAt = new Date(existingInvite.created_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (createdAt > oneHourAgo) {
        console.log('⚠️ Recent invitation already exists, reusing it');
        return existingInvite as Invitation;
      } else {
        console.log('🗑️ Old invitation found, will create a new one');
      }
    }

    // Generate unique token
    const token = generateToken();
    
    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationData = {
      token,
      tenant_id: tenantIdNum,
      tenant_email: tenantEmail.toLowerCase().trim(),
      tenant_name: tenantName.trim(),
      is_accepted: false,
      expires_at: expiresAt.toISOString()
    };

    console.log('💾 Inserting invitation:', {
      tenant_id: invitationData.tenant_id,
      tenant_email: invitationData.tenant_email,
      tenant_name: invitationData.tenant_name,
      token: token.substring(0, 10) + '...'
    });

    // Insert invitation
    const { data, error } = await supabase
      .from('invitations')
      .insert(invitationData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Failed to create invitation: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from invitation creation');
    }

    console.log('✅ Invitation created successfully:', {
      id: data.id,
      tenant_id: data.tenant_id,
      token: data.token.substring(0, 10) + '...',
      expires_at: data.expires_at
    });

    return data as Invitation;
  } catch (error: any) {
    console.error('❌ Error in createInvitation:', error);
    throw error;
  }
};

/**
 * Generate invitation link
 */
export const generateInvitationLink = (token: string): string => {
  if (!token) {
    throw new Error('Token is required to generate invitation link');
  }

  const baseUrl = window.location.origin;
  const link = `${baseUrl}/#/accept-invite?token=${token}`;
  
  console.log('🔗 Generated invitation link');
  
  return link;
};

/**
 * Get invitation by token
 */
export const getInvitationByToken = async (token: string): Promise<Invitation> => {
  try {
    console.log('🔍 Fetching invitation for token');

    if (!token || token.trim() === '') {
      throw new Error('Token is required');
    }

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token.trim())
      .single();

    if (error) {
      console.error('❌ Error fetching invitation:', error);
      
      if (error.code === 'PGRST116') {
        throw new Error('Invitation not found or has expired');
      }
      
      throw new Error(`Failed to fetch invitation: ${error.message}`);
    }

    if (!data) {
      throw new Error('Invitation not found');
    }

    console.log('✅ Invitation found:', {
      id: data.id,
      tenant_name: data.tenant_name,
      tenant_email: data.tenant_email,
      is_accepted: data.is_accepted,
      expires_at: data.expires_at
    });

    return data as Invitation;
  } catch (error: any) {
    console.error('❌ Error in getInvitationByToken:', error);
    throw error;
  }
};

/**
 * Validate invitation
 */
export const validateInvitation = (invitation: Invitation): {
  isValid: boolean;
  error?: string;
} => {
  console.log('🔍 Validating invitation:', {
    id: invitation.id,
    is_accepted: invitation.is_accepted,
    expires_at: invitation.expires_at
  });

  // Check if invitation exists
  if (!invitation) {
    return {
      isValid: false,
      error: 'Invitation not found'
    };
  }

  // Check if already accepted
  if (invitation.is_accepted) {
    console.log('❌ Invitation already accepted');
    return {
      isValid: false,
      error: 'This invitation has already been accepted. Please log in to your account.'
    };
  }

  // Check if expired
  if (invitation.expires_at) {
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    
    if (now > expiresAt) {
      console.log('❌ Invitation expired:', {
        expires_at: expiresAt.toISOString(),
        now: now.toISOString()
      });
      
      return {
        isValid: false,
        error: 'This invitation has expired. Please contact your property manager for a new invitation.'
      };
    }
  }

  console.log('✅ Invitation is valid');
  
  return { isValid: true };
};

/**
 * Accept invitation
 */
export const acceptInvitation = async (token: string, email: string): Promise<void> => {
  try {
    console.log('📝 Accepting invitation...');

    if (!token || !email) {
      throw new Error('Token and email are required');
    }

    // First, verify the invitation exists and is valid
    const invitation = await getInvitationByToken(token);
    
    const validation = validateInvitation(invitation);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid invitation');
    }

    // Verify email matches
    if (invitation.tenant_email.toLowerCase().trim() !== email.toLowerCase().trim()) {
      throw new Error('Email does not match the invitation');
    }

    // Update invitation status
    const { error } = await supabase
      .from('invitations')
      .update({
        is_accepted: true,
        accepted_at: new Date().toISOString()
      })
      .eq('token', token.trim())
      .eq('tenant_email', email.toLowerCase().trim());

    if (error) {
      console.error('❌ Error accepting invitation:', error);
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }

    console.log('✅ Invitation accepted successfully');
  } catch (error: any) {
    console.error('❌ Error in acceptInvitation:', error);
    throw error;
  }
};

/**
 * Check if tenant has pending invitation by tenant ID
 */
export const hasPendingInvitation = async (tenantId: string | number): Promise<boolean> => {
  try {
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
    
    if (isNaN(tenantIdNum)) {
      console.error('Invalid tenant ID');
      return false;
    }

    console.log('🔍 Checking for pending invitation:', tenantIdNum);

    const { data, error } = await supabase
      .from('invitations')
      .select('id, created_at')
      .eq('tenant_id', tenantIdNum)
      .eq('is_accepted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking pending invitation:', error);
      return false;
    }

    if (!data) {
      console.log('✅ No pending invitation found');
      return false;
    }

    // Check if invitation is recent (within 1 hour)
    const createdAt = new Date(data.created_at);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const isPending = createdAt > oneHourAgo;
    
    console.log(isPending ? '⚠️ Pending invitation exists' : '✅ Old invitation, can create new');
    
    return isPending;
  } catch (error: any) {
    console.error('❌ Error checking pending invitation:', error);
    return false;
  }
};

/**
 * Check if tenant has accepted their invitation by email
 */
export const hasAcceptedInvitation = async (email: string): Promise<boolean> => {
  try {
    console.log('🔍 Checking if tenant has accepted invitation for email:', email);

    if (!email || email.trim() === '') {
      console.error('Email is required');
      return false;
    }

    const { data, error } = await supabase
      .from('invitations')
      .select('is_accepted, tenant_id, tenant_email')
      .eq('tenant_email', email.toLowerCase().trim())
      .eq('is_accepted', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking invitation status:', error);
      return false;
    }

    const hasAccepted = !!data;
    console.log(hasAccepted ? '✅ Tenant has accepted invitation' : '❌ Tenant has not accepted invitation');
    
    return hasAccepted;
  } catch (error: any) {
    console.error('❌ Error in hasAcceptedInvitation:', error);
    return false;
  }
};

/**
 * Get invitation stats for a tenant
 */
export const getInvitationStats = async (tenantId: string | number): Promise<{
  totalInvitations: number;
  acceptedInvitations: number;
  lastInvitationDate: string | null;
  isAccepted: boolean;
}> => {
  try {
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;

    if (isNaN(tenantIdNum)) {
      return {
        totalInvitations: 0,
        acceptedInvitations: 0,
        lastInvitationDate: null,
        isAccepted: false
      };
    }

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('tenant_id', tenantIdNum)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitation stats:', error);
      return {
        totalInvitations: 0,
        acceptedInvitations: 0,
        lastInvitationDate: null,
        isAccepted: false
      };
    }

    const totalInvitations = data.length;
    const acceptedInvitations = data.filter(inv => inv.is_accepted).length;
    const lastInvitationDate = data.length > 0 ? data[0].created_at : null;
    const isAccepted = data.length > 0 ? data[0].is_accepted : false;

    return {
      totalInvitations,
      acceptedInvitations,
      lastInvitationDate,
      isAccepted
    };
  } catch (error: any) {
    console.error('Error getting invitation stats:', error);
    return {
      totalInvitations: 0,
      acceptedInvitations: 0,
      lastInvitationDate: null,
      isAccepted: false
    };
  }
};

/**
 * Resend invitation (creates new token)
 */
export const resendInvitation = async (
  tenantId: string | number,
  tenantEmail: string,
  tenantName: string
): Promise<Invitation> => {
  try {
    console.log('🔄 Resending invitation...');

    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;

    if (isNaN(tenantIdNum)) {
      throw new Error('Invalid tenant ID');
    }

    // Mark old invitations as expired
    await supabase
      .from('invitations')
      .update({ expires_at: new Date().toISOString() })
      .eq('tenant_id', tenantIdNum)
      .eq('is_accepted', false);

    // Create new invitation
    return await createInvitation(tenantIdNum, tenantEmail, tenantName);
  } catch (error: any) {
    console.error('❌ Error resending invitation:', error);
    throw error;
  }
};

/**
 * Delete invitation
 */
export const deleteInvitation = async (invitationId: number): Promise<void> => {
  try {
    console.log('🗑️ Deleting invitation:', invitationId);

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error('❌ Error deleting invitation:', error);
      throw new Error(`Failed to delete invitation: ${error.message}`);
    }

    console.log('✅ Invitation deleted successfully');
  } catch (error: any) {
    console.error('❌ Error in deleteInvitation:', error);
    throw error;
  }
};

/**
 * Get all invitations for admin view
 */
export const getAllInvitations = async (): Promise<Invitation[]> => {
  try {
    console.log('📋 Fetching all invitations...');

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching invitations:', error);
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    console.log(`✅ Fetched ${data.length} invitations`);

    return data as Invitation[];
  } catch (error: any) {
    console.error('❌ Error in getAllInvitations:', error);
    throw error;
  }
};

/**
 * Get pending invitations count
 */
export const getPendingInvitationsCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('is_accepted', false);

    if (error) {
      console.error('Error fetching pending invitations count:', error);
      return 0;
    }

    return count || 0;
  } catch (error: any) {
    console.error('Error in getPendingInvitationsCount:', error);
    return 0;
  }
};

/**
 * Cleanup expired invitations
 */
export const cleanupExpiredInvitations = async (): Promise<number> => {
  try {
    console.log('🧹 Cleaning up expired invitations...');

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('invitations')
      .delete()
      .lt('expires_at', now)
      .eq('is_accepted', false)
      .select();

    if (error) {
      console.error('❌ Error cleaning up invitations:', error);
      throw new Error(`Failed to cleanup invitations: ${error.message}`);
    }

    const deletedCount = data?.length || 0;
    console.log(`✅ Cleaned up ${deletedCount} expired invitations`);

    return deletedCount;
  } catch (error: any) {
    console.error('❌ Error in cleanupExpiredInvitations:', error);
    return 0;
  }
};
