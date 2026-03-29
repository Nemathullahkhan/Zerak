import {
  AlertTriangleIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PackageOpenIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

// ─── EntityHeader ──────────────────────────────────────────────────────────

type EntityHeaderProps = {
  title: string;
  description?: string;
  newButtonLabel?: string;
  disabled?: boolean;
  isCreating?: boolean;
} & (
  | { onNew: () => void; newButtonHref?: never }
  | { newButtonHref: string; onNew?: never }
  | { onNew?: never; newButtonHref?: never }
);

export const EntityHeader = ({
  title,
  description,
  newButtonLabel,
  onNew,
  newButtonHref,
  disabled,
  isCreating,
}: EntityHeaderProps) => {
  return (
    <div className="flex flex-row items-center justify-between gap-x-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-white/35">{description}</p>
        )}
      </div>

      {onNew && !newButtonHref && (
        <button
          disabled={isCreating || disabled}
          onClick={onNew}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-[7px] rounded-xl text-[13px] font-semibold transition-all duration-150 border-none cursor-pointer",
            "bg-blue-500 hover:bg-blue-400 active:scale-[0.97] text-white shadow-[0_2px_12px_rgba(59,130,246,0.3)]",
            "disabled:bg-[#27272a] disabled:text-white/25 disabled:shadow-none disabled:cursor-not-allowed",
          )}
        >
          {isCreating ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <PlusIcon className="size-3.5" />
          )}
          {newButtonLabel ?? "New"}
        </button>
      )}

      {newButtonHref && !onNew && (
        <Link
          href={newButtonHref}
          prefetch
          className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-xl text-[13px] font-semibold bg-blue-500 hover:bg-blue-400 text-white shadow-[0_2px_12px_rgba(59,130,246,0.3)] transition-all active:scale-[0.97]"
        >
          <PlusIcon className="size-3.5" />
          {newButtonLabel ?? "New"}
        </Link>
      )}
    </div>
  );
};

// ─── EntityContainer ────────────────────────────────────────────────────────

type EntityContainerProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
  search?: React.ReactNode;
  pagination?: React.ReactNode;
};

export const EntityContainer = ({
  header,
  search,
  pagination,
  children,
}: EntityContainerProps) => {
  return (
    <div className="px-4 md:px-10 py-5 h-full">
      <div className="mx-auto max-w-screen-xl w-full flex flex-col gap-y-6 h-full">
        {/* Sub-header row: title left, search right */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">{header}</div>
          {search}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-y-3 flex-1">{children}</div>

        {pagination}
      </div>
    </div>
  );
};

// ─── EntitySearch ────────────────────────────────────────────────────────────

interface EntitySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const EntitySearch = ({
  value,
  onChange,
  placeholder,
}: EntitySearchProps) => {
  return (
    <div className="relative shrink-0">
      <SearchIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
      <input
        className={cn(
          "w-[200px] h-9 pl-8 pr-3 rounded-xl text-[13px]",
          "bg-[#1c1c1e] border border-[#2a2a2e] text-white/70 placeholder:text-white/20",
          "outline-none focus:border-[#3a3a3f] transition-colors",
        )}
        placeholder={placeholder ?? "Search…"}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

// ─── EntityPagination ────────────────────────────────────────────────────────

interface EntityPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const EntityPagination = ({
  page,
  totalPages,
  onPageChange,
  disabled,
}: EntityPaginationProps) => {
  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-[12px] text-white/25">
        Page {page} of {totalPages || 1}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page === 1 || disabled}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className={cn(
            "size-8 rounded-lg flex items-center justify-center transition-colors",
            "bg-[#1c1c1e] border border-[#2a2a2e] text-white/40",
            "hover:bg-[#27272a] hover:text-white/70",
            "disabled:opacity-30 disabled:cursor-not-allowed",
          )}
        >
          <ChevronLeftIcon className="size-3.5" />
        </button>
        <button
          disabled={page === totalPages || totalPages === 0 || disabled}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className={cn(
            "size-8 rounded-lg flex items-center justify-center transition-colors",
            "bg-[#1c1c1e] border border-[#2a2a2e] text-white/40",
            "hover:bg-[#27272a] hover:text-white/70",
            "disabled:opacity-30 disabled:cursor-not-allowed",
          )}
        >
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── State views ─────────────────────────────────────────────────────────────

interface StateViewProps {
  message?: string;
}

export const LoadingView = ({ message }: StateViewProps) => (
  <div className="flex flex-1 justify-center items-center flex-col gap-3 py-20">
    <Loader2Icon className="size-5 animate-spin text-white/20" />
    {message && <p className="text-[13px] text-white/25">{message}</p>}
  </div>
);

export const ErrorView = ({ message }: StateViewProps) => (
  <div className="flex flex-1 justify-center items-center flex-col gap-3 py-20">
    <AlertTriangleIcon className="size-5 text-red-400/50" />
    {message && <p className="text-[13px] text-white/30">{message}</p>}
  </div>
);

interface EmptyViewProps extends StateViewProps {
  onNew?: () => void;
}

export const EmptyView = ({ message, onNew }: EmptyViewProps) => (
  <div className="flex flex-1 flex-col items-center justify-center py-20 gap-4">
    <div className="size-12 rounded-2xl bg-[#1c1c1e] border border-[#2a2a2e] flex items-center justify-center">
      <PackageOpenIcon className="size-5 text-white/20" />
    </div>
    <div className="text-center">
      <p className="text-[14px] font-medium text-white/50 mb-1">
        No workflows yet
      </p>
      {message && (
        <p className="text-[12px] text-white/25 max-w-xs leading-relaxed">
          {message}
        </p>
      )}
    </div>
    {onNew && (
      <button
        onClick={onNew}
        className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-xl text-[13px] font-semibold bg-blue-500 hover:bg-blue-400 active:scale-[0.97] text-white shadow-[0_2px_12px_rgba(59,130,246,0.3)] transition-all mt-1"
      >
        <PlusIcon className="size-3.5" />
        Create your first workflow
      </button>
    )}
  </div>
);

// ─── EntityList ───────────────────────────────────────────────────────────────

interface EntityListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey?: (item: T, index: number) => string | number;
  emptyView?: React.ReactNode;
  className?: string;
}

export function EntityList<T>({
  items,
  renderItem,
  getKey,
  emptyView,
  className,
}: EntityListProps<T>) {
  if (items.length === 0 && emptyView) {
    return (
      <div className="flex-1 flex justify-center items-center">{emptyView}</div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-y-2", className)}>
      {items.map((item, index) => (
        <div key={getKey ? getKey(item, index) : index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

// ─── EntityItem ───────────────────────────────────────────────────────────────

interface EntityItemProps {
  href: string;
  title: string;
  subtitle?: React.ReactNode;
  image?: React.ReactNode;
  actions?: React.ReactNode;
  onRemove?: () => void | Promise<void>;
  isRemoving?: boolean;
  className?: string;
}

export const EntityItem = ({
  href,
  title,
  subtitle,
  image,
  actions,
  onRemove,
  isRemoving,
  className,
}: EntityItemProps) => {
  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRemoving || !onRemove) return;
    await onRemove();
  };

  return (
    <Link href={href} prefetch>
      <div
        className={cn(
          "group flex items-center justify-between px-4 py-3.5 rounded-2xl border border-[#2a2a2e] bg-[#18181b]",
          "hover:border-[#3a3a3f] hover:bg-[#1e1e21] transition-all duration-150 cursor-pointer",
          isRemoving && "opacity-40 pointer-events-none",
          className,
        )}
      >
        {/* Left: icon + text */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 size-9 rounded-xl bg-[#27272a] border border-[#333336] flex items-center justify-center group-hover:border-[#3f3f44] transition-colors">
            {image}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-white/80 truncate group-hover:text-white transition-colors">
              {title}
            </p>
            {subtitle && (
              <p className="text-[12px] text-white/30 truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        {(actions || onRemove) && (
          <div
            className="flex items-center gap-2 ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.preventDefault()}
          >
            {actions}
            {onRemove && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="size-7 rounded-lg bg-[#27272a] hover:bg-[#333335] border border-[#333336] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVerticalIcon className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#1c1c1e] border-[#2a2a2e] text-white/70"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onClick={handleRemove}
                    className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10 gap-2 cursor-pointer"
                  >
                    <TrashIcon className="size-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};
