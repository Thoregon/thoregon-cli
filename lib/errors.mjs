/**
 *
 *
 * @author: blukassen
 */



import { EError}    from "/evolux.supervise";

export const ErrNotInstalled                = ()            => new EError(`No Thoregon installed`,                          "CLI:00001");
export const ErrSIDRequestExists            = (msg)         => new EError(`A SID request for '${msg}' already exists`,      "CLI:00002");
export const ErrNotADirectory               = (msg)         => new EError(`Not a directory: '${msg}'`,                      "CLI:00003");

export const ErrOptionMissing               = (msg)         => new EError(`Option missing: '${msg}'`,                       "CLI:00101");
export const ErrIdentityNotFound            = (msg)         => new EError(`Identity missing: '${msg}'`,                     "CLI:00102");
export const ErrAgentNotFound               = (msg)         => new EError(`Agent defintion missing: '${msg}'`,              "CLI:00103");
export const ErrAppNotFound                 = (msg)         => new EError(`Application defintion missing: '${msg}'`,        "CLI:00104");
