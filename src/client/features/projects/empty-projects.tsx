import { AddSquareIcon, FolderOpenIcon } from "@hugeicons/core-free-icons";
import { AppIcon, shellButton, surfaceClass } from "../../components/ui/primitives";

export function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <div className={`${surfaceClass("mx-auto max-w-3xl p-10 text-center")}`}>
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-xl bg-neutral-950 text-white">
        <AppIcon icon={FolderOpenIcon} size={24} />
      </div>
      <h2 className="text-2xl font-medium tracking-tight text-neutral-950">No projects yet</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-500">Create a project, then add services inside it. Each service gets its own deploys, logs, variables, and domains.</p>
      <button type="button" className={`${shellButton("primary")} mt-6`} onClick={onCreate}>
        <AppIcon icon={AddSquareIcon} size={16} />
        New project
      </button>
    </div>
  );
}
