export const DOCKER_IMAGE_REPO_URL = "docker-image";
export const DOCKER_IMAGE_REPO_FULL_NAME_PREFIX = "image:";

type ServiceSourceShape = {
  repoFullName: null | string;
  repoUrl: string;
};

type DockerImageValidation =
  | {
      ok: true;
      image: string;
    }
  | {
      ok: false;
      error: string;
    };

const domainComponent = String.raw`[a-z0-9](?:[a-z0-9-]*[a-z0-9])?`;
const registryDomain = String.raw`(?:${domainComponent}(?:\.${domainComponent})*|localhost)(?::[0-9]+)?`;
const nameComponent = String.raw`[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*`;
const imagePath = String.raw`${nameComponent}(?:/${nameComponent})*`;
const imageTag = String.raw`[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}`;
const imageDigest = String.raw`[A-Za-z][A-Za-z0-9]*(?:[+._-][A-Za-z][A-Za-z0-9]*)*:[A-Fa-f0-9]{32,}`;
const dockerImageReferencePattern = new RegExp(
  String.raw`^(?:${registryDomain}/)?${imagePath}(?::${imageTag})?(?:@${imageDigest})?$`
);

export function isDatabaseService(service: ServiceSourceShape) {
  return service.repoUrl === "database" || (service.repoFullName?.startsWith("database:") ?? false);
}

export function isDockerImageService(service: ServiceSourceShape) {
  return service.repoUrl === DOCKER_IMAGE_REPO_URL || (service.repoFullName?.startsWith(DOCKER_IMAGE_REPO_FULL_NAME_PREFIX) ?? false);
}

export function normalizeDockerImageReference(value: string) {
  return value.trim();
}

export function validateDockerImageReference(value: string): DockerImageValidation {
  const image = normalizeDockerImageReference(value);
  if (!image) {
    return { ok: false, error: "Docker image is required" };
  }

  if (image.length > 512) {
    return { ok: false, error: "Docker image reference is too long" };
  }

  if (/[\s\x00-\x1F\x7F]/.test(image)) {
    return { ok: false, error: "Docker image reference cannot contain spaces" };
  }

  if (image.startsWith("-")) {
    return { ok: false, error: "Docker image reference cannot start with a dash" };
  }

  if (/^https?:\/\//i.test(image)) {
    return { ok: false, error: "Use an image reference like ghcr.io/org/app:tag, not a URL" };
  }

  if (!dockerImageReferencePattern.test(image)) {
    return { ok: false, error: "Use a valid Docker image reference like nginx:alpine or ghcr.io/org/app:tag" };
  }

  return { ok: true, image };
}

export function dockerImageRepoFullName(image: string) {
  const validated = validateDockerImageReference(image);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  return `${DOCKER_IMAGE_REPO_FULL_NAME_PREFIX}${validated.image}`;
}

export function dockerImageForService(service: Pick<ServiceSourceShape, "repoFullName">) {
  return service.repoFullName?.startsWith(DOCKER_IMAGE_REPO_FULL_NAME_PREFIX)
    ? service.repoFullName.slice(DOCKER_IMAGE_REPO_FULL_NAME_PREFIX.length)
    : "";
}
