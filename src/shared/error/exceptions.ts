import { SystemException} from "./index"
import {NatureErrors} from "./NatureErrors.enum"
import  { type SelectedSpecificity } from "./specificity";



export class DomainException extends SystemException {
  constructor(message: string, specificity: SelectedSpecificity<NatureErrors.DOMAIN>,e?: Error) {
    super(message, NatureErrors.DOMAIN, specificity, e);
  }
}

export class NegotiateException extends SystemException {
   constructor(message: string, specificity: SelectedSpecificity<NatureErrors.NEGOTIATE>,e?: Error) {
    super(message, NatureErrors.NEGOTIATE, specificity, e);
  }
}

export class DbException extends SystemException {
   constructor(message: string, specificity: SelectedSpecificity<NatureErrors.DATABASE>,e?: Error) {
    super(message, NatureErrors.DATABASE, specificity, e);
  }
}

export class InternalException extends SystemException {
   constructor(message: string, specificity: SelectedSpecificity<NatureErrors.INTERNAL>,e?: Error) {
    super(message, NatureErrors.INTERNAL, specificity, e);
  }
}
export class IntegrationException extends SystemException {
   constructor(message: string, specificity: SelectedSpecificity<NatureErrors.INTEGRATION>,e?: Error) {
    super(message, NatureErrors.INTEGRATION, specificity, e);
  }
}

