
/**
 * Global Form Persistence Utility
 * Automatically saves input values to localStorage and restores them on page load/navigation.
 * Excludes password fields and sensitive data.
 */

const STORAGE_PREFIX = 'fivs_form_';

const getStorageKey = (id: string) => {
    const path = window.location.pathname.replace(/\//g, '_');
    return `${STORAGE_PREFIX}${path}_${id}`;
};

const saveValue = (id: string, value: string | boolean) => {
    if (!id) return;
    localStorage.setItem(getStorageKey(id), JSON.stringify(value));
};

const getValue = (id: string) => {
    if (!id) return null;
    const saved = localStorage.getItem(getStorageKey(id));
    if (saved === null) return null;
    try {
        return JSON.parse(saved);
    } catch (e) {
        return null;
    }
};

const clearValue = (id: string) => {
    if (!id) return;
    localStorage.removeItem(getStorageKey(id));
};

const isPersistable = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
    // Don't persist passwords
    if (element.type === 'password') return false;
    // Requires an ID
    if (!element.id) return false;
    // Don't persist hidden fields (usually internal state)
    if (element.type === 'hidden') return false;
    // Don't persist file uploads (cannot restore easily from localStorage)
    if (element.type === 'file') return false;

    return true;
};

const restoreElementValue = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
    if (!isPersistable(element)) return;

    const savedValue = getValue(element.id);
    if (savedValue === null) return;

    const setValue = (el: any, val: any) => {
        const proto = Object.getPrototypeOf(el);
        const descriptor = Object.getOwnPropertyDescriptor(proto, el.type === 'checkbox' || el.type === 'radio' ? 'checked' : 'value');

        if (descriptor && descriptor.set) {
            descriptor.set.call(el, val);
        } else {
            // Fallback for elements where descriptor might not be found
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = val;
            } else {
                el.value = val;
            }
        }

        // Dispatch events to trigger React's SyntheticEvent handlers
        const eventType = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') ? 'change' : 'input';
        const event = new Event(eventType, { bubbles: true });
        el.dispatchEvent(event);
    };

    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
        setValue(element, savedValue === true);
    } else {
        setValue(element, savedValue);
    }
};

const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!target || !isPersistable(target)) return;

    let value: string | boolean;
    if (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) {
        value = target.checked;
    } else {
        value = target.value;
    }

    saveValue(target.id, value);
};

const handleFormSubmit = (e: Event) => {
    const form = e.target as HTMLFormElement;
    if (!form) return;

    // Clear persisted data for this form on successful submission
    const elements = form.querySelectorAll('input, textarea, select');
    elements.forEach((el) => {
        const element = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (element.id) {
            clearValue(element.id);
        }
    });
};

/**
 * Initializes form persistence logic.
 * Should be called once in the root component (App.tsx).
 */
export const initFormPersistence = () => {
    // Listen for input events globally
    document.addEventListener('input', handleInput);
    document.addEventListener('change', handleInput);
    document.addEventListener('submit', handleFormSubmit);

    // Restore existing values for elements currently in DOM
    const restoreAll = () => {
        const elements = document.querySelectorAll('input, textarea, select');
        elements.forEach((el) => {
            restoreElementValue(el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement);
        });
    };

    // Initial restoration with a small delay to ensure React mount cycle is complete
    setTimeout(restoreAll, 100);

    // Watch for DOM changes (modals, new pages) to restore new elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLElement) {
                    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') {
                        restoreElementValue(node as any);
                    } else {
                        const children = node.querySelectorAll('input, textarea, select');
                        children.forEach((child) => restoreElementValue(child as any));
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
        document.removeEventListener('input', handleInput);
        document.removeEventListener('change', handleInput);
        document.removeEventListener('submit', handleFormSubmit);
        observer.disconnect();
    };
};
