/**
 *
 *
 * @author: blukassen
 */



import { EError}    from "/evolux.supervise";

export const ErrNotInstalled                = ()            => new EError(`No Thoregon installed`,                          "CLI:00001");
export const ErrSIDRequestExists            = (msg)         => new EError(`A SID request for '${msg}' already exists`,      "CLI:00002");
export const ErrNotADirectory               = (msg)         => new EError(`Not a directory: '${msg}'`,                      "CLI:00003");
