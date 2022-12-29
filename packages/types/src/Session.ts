export type JWT = {
  exp: number;
  UserID?: string;
  JPMCIdentifier?: string;
  UID?: string;
  EmployeeCorporateID?: string;
  CostCenter?: string;
  Country?: string;
  CountryCode?: string;
  Department?: string;
  DisplayName?: string;
  Email?: string;
  EmployeeType?: string;
  FirstName?: string;
  LastName?: string;
  LOB?: string;
  LocationCode?: string;
};

export type Session = {
  isLoggedIn: boolean;
  accessToken?: string;
  isCypressSession?: boolean;
  expires?: number;
  user?: {
    avatarUrl: string;
    sid: string;
    country?: string;
    countryCode?: string;
    costCenter?: string;
    department?: string;
    displayName?: string;
    email?: string;
    employeeType?: string;
    firstName?: string;
    lastName?: string;
    lob?: string;
    locationCode?: string;
  };
};
