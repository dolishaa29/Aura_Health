import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  AsYouType,
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode
} from "libphonenumber-js";

/**
 * Country selector + national number. Reports E.164 (+countrycode…) to onChange when valid.
 */
const PhoneNumber = ({
  id = "phone",
  name = "phone",
  value,
  onChange,
  error,
  defaultCountry = "IN",
  disabled = false
}) => {
  const [country, setCountry] = useState(defaultCountry);
  const [national, setNational] = useState("");
  const prevValueRef = useRef(value);

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return getCountries()
      .map((iso) => {
        try {
          return {
            iso,
            dial: getCountryCallingCode(iso),
            name: names.of(iso) || iso
          };
        } catch {
          return { iso, dial: getCountryCallingCode(iso), name: iso };
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;

    if (prev && !value) {
      setNational("");
      setCountry(defaultCountry);
      return;
    }
    if (!value) return;

    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.country) {
      setCountry(parsed.country);
      const ayt = new AsYouType(parsed.country);
      setNational(ayt.input(parsed.nationalNumber));
    }
  }, [value, defaultCountry]);

  const handleCountryChange = (e) => {
    const next = e.target.value;
    setCountry(next);
    setNational("");
    onChange("");
  };

  const handleNationalChange = (e) => {
    const ayt = new AsYouType(country);
    const formatted = ayt.input(e.target.value);
    setNational(formatted);
    const num = ayt.getNumber();
    if (num?.isValid()) {
      onChange(num.format("E.164"));
    } else {
      onChange("");
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs text-slate-400 mb-1.5">
        Phone number
      </label>
      <div
        className={`flex rounded-xl border bg-slate-950 overflow-hidden focus-within:ring-1 focus-within:ring-emerald-500/40 ${
          error ? "border-rose-500/60" : "border-slate-700"
        }`}
      >
        <select
          id={`${id}-country`}
          name={`${name}Country`}
          value={country}
          onChange={handleCountryChange}
          disabled={disabled}
          className="shrink-0 max-w-[42%] sm:max-w-[48%] pl-3 pr-1 py-3 bg-slate-900 border-0 text-xs sm:text-sm text-slate-200 focus:ring-0 cursor-pointer disabled:opacity-50"
          aria-label="Country"
        >
          {countries.map(({ iso, dial, name: label }) => (
            <option key={iso} value={iso}>
              {label} (+{dial})
            </option>
          ))}
        </select>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={handleNationalChange}
          disabled={disabled}
          placeholder="National number"
          className="flex-1 min-w-0 px-3 py-3 bg-slate-950 border-0 text-sm focus:ring-0 placeholder:text-slate-600 disabled:opacity-50"
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
    </div>
  );
};

export default PhoneNumber;
