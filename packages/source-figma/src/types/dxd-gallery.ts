export type Tag = {
  id: string;
  name: string;
  longDescription: string;
  shortDescription: string;
  color: string;
  custom: boolean;
};

export type TagResponse = {
  data: Tag[];
};

export type Project = {
  id: number;
  projectTitle: string;
  projectSubtitle: null | string;
  figmaId: string;
  lastUpdated: string;
  device: string;
  status: string;
  resource: string;
  areaOfWork: string;
  customAreaOfWork: boolean;
  createdByActive: boolean;
  createdByUserSID: string;
  createdByAvatar: null | string;
  createdByFirstName: null | string;
  createdByLastName: null | string;
  createdByFullName: null | string;
  imageUrl: null | string;
  adornmentColor: null | string;
  isArchive: boolean;
  visible: boolean;
  customCover: boolean;
  coverUrl: string;
  description: string;
  tags: string[];
  prevProject?: null | string;
  nextProject?: null | string;
  images?: Image[];
};

export type Image = {
  url: string;
  nodeId: string;
  fallback: boolean;
};
