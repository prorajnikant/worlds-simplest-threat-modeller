"use client";

interface ArchitectureInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

const SAMPLE = `A multi-tenant SaaS application. Each tenant has isolated PostgreSQL schemas on a shared database cluster. A Node.js API handles authentication with JWTs. Users upload documents which are processed by a Python Lambda function and stored in S3. An admin panel is served from the same domain. The API communicates with a third-party payment processor.`;

export function ArchitectureInput({ value, onChange, onSubmit, disabled }: ArchitectureInputProps) {
  const charCount = value.length;
  const tooShort = charCount > 0 && charCount < 50;
  const tooLong = charCount > 10000;
  const valid = charCount >= 50 && charCount <= 10000;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="arch-description" className="text-sm font-medium text-gray-700">
          Architecture Description
        </label>
        <button
          type="button"
          onClick={() => onChange(SAMPLE)}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Use sample
        </button>
      </div>
      <textarea
        id="arch-description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe your system architecture in plain text. Include components, technologies, data flows, and trust boundaries. The more specific you are, the more targeted the threats will be.&#10;&#10;Example: A Node.js REST API with JWT authentication backed by PostgreSQL. Users upload files to S3. An admin dashboard on the same domain. Deployed on EC2 behind an Nginx reverse proxy."
        rows={8}
        disabled={disabled}
        className={`w-full rounded-lg border px-4 py-3 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${
          tooShort || tooLong
            ? "border-red-300 focus:ring-red-400"
            : "border-gray-300 focus:border-blue-500"
        }`}
      />
      <div className="flex items-center justify-between">
        <div>
          {tooShort && (
            <p className="text-xs text-red-600">Too short — add more detail ({50 - charCount} more characters needed)</p>
          )}
          {tooLong && (
            <p className="text-xs text-red-600">Too long — please shorten your description</p>
          )}
        </div>
        <span className={`text-xs ${tooLong ? "text-red-600" : "text-gray-400"}`}>
          {charCount.toLocaleString()} / 10,000
        </span>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !valid}
        className="w-full py-3 px-6 rounded-lg bg-blue-700 text-white font-semibold text-sm hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {disabled ? "Analyzing…" : "Analyze Threats"}
      </button>
    </div>
  );
}
