export type Membership = {
  organization: string;
  organization_name: string;
  role: string;
  role_label: string;
  permissions: string[];
};

export type Me = { id: string; username: string; full_name: string; memberships: Membership[] };

export type Question = {
  code: string;
  label: string;
  type: 'single' | 'number' | 'text';
  required?: boolean;
  sensitive?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  show_if?: Record<string, string>;
};

export type Questionnaire = {
  id: string;
  code: string;
  version: number;
  title: string;
  questions_count?: number;
  variant?: { variant: string; label: string; description: string; minutes: number | null; order: number; recommended_for: string[] };
  definition: {
    sections: { code: string; title: string; icon?: string; questions: Question[] }[];
    special_values: Record<string, string>;
  };
};

export type Territory = { id: string; code: string; name: string; level: string; parent: string | null; parent_name: string | null };

export type FieldOperation = { id: string; code: string; title: string; kind: string; kind_label: string; status: string };

export type FieldPack = {
  me: Me;
  organizationId: string;
  organizationName: string;
  /** Questionnaire complet (rétrocompatibilité avec les packs déjà téléchargés). */
  questionnaire: Questionnaire;
  /** Formulaires disponibles, du plus court au plus complet. */
  questionnaires?: Questionnaire[];
  territories: Territory[];
  operations: FieldOperation[];
  downloadedAt: string;
};

export type Relation = 'head' | 'spouse' | 'child' | 'parent' | 'relative' | 'other';

export type DraftMember = {
  client_uuid: string;
  first_name: string;
  last_name: string;
  sex: 'F' | 'M' | 'U';
  estimated_age: number | null;
  phone: string;
  relation: Relation;
  has_identity_document: boolean;
  vulnerabilities: string[];
};

export type Submission = {
  client_uuid: string;
  createdAt: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
  attempts: number;
  sentAt?: string;
  result?: { household: { public_code: string }; members: { client_uuid: string; public_code: string }[] };
  payload: {
    client_uuid: string;
    organization: string;
    questionnaire: string;
    territory: string | null;
    address_description: string;
    gps_consent: boolean;
    latitude: number | null;
    longitude: number | null;
    emergency: boolean;
    operation: string | null;
    collected_at: string;
    device_id: string;
    members: (DraftMember & { answers: Record<string, unknown> })[];
  };
  summary: { headName: string; territoryName: string; membersCount: number; operationTitle?: string };
};
